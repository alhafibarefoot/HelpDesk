import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check for Admin permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // 1. Get Data from Body
        const body = await request.json().catch(() => null);
        const sourceData = body?.users || [];

        if (!sourceData || sourceData.length === 0) {
            return NextResponse.json({
                error: 'No data provided',
                message: 'Please send a JSON body with { "users": [...] }'
            }, { status: 400 });
        }

        const results = {
            processed: 0,
            updated: 0,
            created: 0,
            errors: [] as string[]
        };

        // 2. Fetch all local users
        const { data: localUsers, error: fetchError } = await supabase
            .from('users')
            .select('id, email');

        if (fetchError) throw fetchError;
        // Note: localUsers might be null if table is empty

        // 3. Process each record
        for (const hrRecord of sourceData) {
            // Corrected Field Mapping based on User Schema
            const email = hrRecord.EmployeeEmail || hrRecord.email;
            const empId = hrRecord.AuthorizedUserID || hrRecord.employeeid || hrRecord.employee_id;
            const mgrId = hrRecord.Manager || hrRecord.managerid || hrRecord.manager_id;
            // Prefer Arabic Name, fallback to English, then others
            const fullName = hrRecord.EmployeeNameAr || hrRecord.EmployeeNameEn || hrRecord.fullname || hrRecord.full_name || hrRecord.name || hrRecord.Name;

            if (!email) {
                results.errors.push(`Skipped record: Missing Email`);
                continue;
            }

            const normalizedEmail = email.trim().toLowerCase();
            const localUser = localUsers?.find(u => u.email?.trim().toLowerCase() === normalizedEmail);

            if (localUser) {
                // UPDATE existing
                const updates = {
                    employee_id: empId ? String(empId) : null,
                    hr_manager_id: mgrId ? String(mgrId) : null,
                    hr_data: hrRecord
                };

                const { error: updateError } = await adminSupabase
                    .from('users')
                    .update(updates)
                    .eq('id', localUser.id);

                if (updateError) {
                    results.errors.push(`Failed to update ${email}: ${updateError.message}`);
                } else {
                    results.updated++;
                }
            } else {
                // CREATE new user
                try {
                    // Create in Auth
                    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
                        email: normalizedEmail,
                        password: '123456',
                        email_confirm: true,
                        user_metadata: {
                            full_name: fullName || email.split('@')[0],
                            employee_id: empId ? String(empId) : null,
                            hr_manager_id: mgrId ? String(mgrId) : null,
                            hr_data: hrRecord
                        }
                    });

                    if (createError) {
                        // Handle "User already registered" (User exists in Auth but maybe not in Public Users table)
                        if (createError.message?.toLowerCase().includes("registered")) {
                            // 1. Find the user in Auth
                            const { data: { users: existingAuthUsers } } = await adminSupabase.auth.admin.listUsers();
                            const authUser = existingAuthUsers.find(u => u.email?.toLowerCase() === normalizedEmail);

                            if (authUser) {
                                // 2. Ensure they assume public user existence
                                const updates = {
                                    id: authUser.id,
                                    email: normalizedEmail,
                                    full_name: fullName || email.split('@')[0],
                                    employee_id: empId ? String(empId) : null,
                                    hr_manager_id: mgrId ? String(mgrId) : null,
                                    hr_data: hrRecord,
                                    // Make sure we don't overwrite roles if they exist, but upsert needs minimal fields
                                    // If row exists, this updates. If not, creates.
                                };

                                const { error: upsertError } = await adminSupabase
                                    .from('users')
                                    .upsert(updates, { onConflict: 'id' }); // Conflict on ID

                                if (upsertError) {
                                    results.errors.push(`Failed to upsert shadow user ${email}: ${upsertError.message}`);
                                } else {
                                    results.updated++; // Count as update/recovery
                                }
                            } else {
                                results.errors.push(`User registered but not found in list? ${email}`);
                            }
                        } else {
                            results.errors.push(`Failed to create ${email}: ${createError.message}`);
                        }
                    } else if (newUser.user) {
                        results.created++;
                    }
                } catch (e: any) {
                    results.errors.push(`Error creating ${email}: ${e.message}`);
                }
            }
            results.processed++;
        }

        // 4. Resolve Direct Manager Links
        // We fetch again to ensure checks against newly created users
        const { data: usersWithHrManagers } = await supabase
            .from('users')
            .select('id, hr_manager_id')
            .not('hr_manager_id', 'is', null);

        if (usersWithHrManagers) {
            const { data: managerLookup } = await supabase
                .from('users')
                .select('id, employee_id')
                .not('employee_id', 'is', null);

            const idMap = new Map<string, string>();
            managerLookup?.forEach(m => {
                if (m.employee_id) idMap.set(String(m.employee_id), m.id);
            });

            for (const u of usersWithHrManagers) {
                if (u.hr_manager_id) {
                    const managerUUID = idMap.get(String(u.hr_manager_id));
                    if (managerUUID) {
                        await adminSupabase.from('users').update({ direct_manager_id: managerUUID }).eq('id', u.id);
                    }
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
