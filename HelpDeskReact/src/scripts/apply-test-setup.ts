
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: '.env.local' });

async function run() {
    console.log("Applying Test Data Setup (via Supabase JS Client)...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
        process.exit(1);
    }

    // Create Admin Client directly (avoids Next.js server dependencies like cookies())
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // 1. Ensure Users Exist & Link Hierarchy
    console.log("Ensuring Users Exist...");
    const testUsers = [
        { email: 'employee@test.com', password: 'password123', role: 'موظف', name: 'أحمد الموظف' },
        { email: 'manager@test.com', password: 'password123', role: 'مدير', name: 'خالد المدير' },
        { email: 'admin@test.com', password: 'password123', role: 'مسؤول خدمة', name: 'سارة المسؤول' } // 'مسؤول خدمة' or special admin role? Using 'مسؤول خدمة' for now or 'admin' if enum allows
    ];

    const userIds: Record<string, string> = {};

    for (const u of testUsers) {
        // Check existence by email via Admin API (reliable)
        // Or just try to create and catch error? listUsers is better.
        // But listUsers is paginated.
        // Let's try to get by email from public.users first?
        // actually, just try create, if exists it might error or return user.

        // createUser returns the user object if created, or error if exists?
        // verify: createUser throws if email exists?

        // Better: List users by email? No direct filter in getAllUsers easily?
        // We can use the public.users select we tried earlier.

        let uid: string | undefined;

        // Check public.users
        const { data: existing } = await supabase.from('users').select('id').eq('email', u.email).single();
        if (existing) {
            uid = existing.id;
            console.log(`User ${u.email} exists (id: ${uid}) - Updating Profile...`);
        } else {
            console.log(`Creating user ${u.email}...`);
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: { full_name: u.name, role: u.role }
            });

            if (createError) {
                console.error(`Error creating ${u.email}:`, createError.message);
                // Fallback: If error says exists but public profile missing?
            } else if (newUser.user) {
                uid = newUser.user.id;
                console.log(`Created ${u.email} (id: ${uid})`);
            }
        }

        // Always update public profile to ensure Role is correct
        if (uid) {
            await supabase.from('users').upsert({
                id: uid,
                email: u.email,
                full_name: u.name,
                role: u.role as any
            });
            userIds[u.email] = uid;
        }
    }

    const empId = userIds['employee@test.com'];
    const mgrId = userIds['manager@test.com'];
    const admId = userIds['admin@test.com'];

    if (empId && mgrId && admId) {
        console.log("Linking Hierarchy...");
        // Manager -> Admin
        await supabase.from('users').update({ direct_manager_id: admId }).eq('id', mgrId);
        // Employee -> Manager
        await supabase.from('users').update({ direct_manager_id: mgrId }).eq('id', empId);
        // Admin -> Null
        await supabase.from('users').update({ direct_manager_id: null }).eq('id', admId);
        console.log("Hierarchy Linked: Employee -> Manager -> Admin");
    } else {
        console.warn("Could not find/create all test users. Skipping hierarchy link.");
    }
    // } removed to extend scope

    // 2. Create Test Service
    console.log("Creating/Updating Test Service...");

    const serviceKey = 'manager_chain_test';
    const { data: existingService } = await supabase.from('services').select('id').eq('key', serviceKey).single();

    let serviceId = existingService?.id;

    if (!serviceId) {
        const { data: newService, error: srvError } = await supabase.from('services').insert({
            key: serviceKey,
            name: 'اختبار سلسلة المدراء',
            description: 'خدمة تجريبية لاختبار الموافقات المتسلسلة',
            is_active: true,
            status: 'active',
            // owning_department: 'إدارة الاختبار', // Column missing in DB, skipping
            form_schema: { fields: [{ key: "reason", label: "السبب", type: "text", required: true }] }
        }).select().single();

        if (srvError) {
            console.error("Error creating service:", srvError);
            return;
        }
        serviceId = newService.id;
    }

    // 3. Create Workflow
    console.log("Creating Workflow for Service:", serviceId);

    // Upsert Workflow (simplified by checking existing)
    // We want to force this definition
    const definition = {
        nodes: [
            { id: 'start', type: 'start', position: { x: 0, y: 0 } },
            {
                id: 'step_manager',
                type: 'approval',
                data: { label: 'موافقة المدير المباشر', role: 'DIRECT_MANAGER' },
                position: { x: 200, y: 0 }
            },
            {
                id: 'step_director',
                type: 'approval',
                data: { label: 'موافقة المدير العام', role: 'MANAGER_LEVEL_2' },
                position: { x: 400, y: 0 }
            },
            { id: 'end', type: 'end', position: { x: 600, y: 0 } }
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'step_manager' },
            { id: 'e2', source: 'step_manager', target: 'step_director' },
            { id: 'e3', source: 'step_director', target: 'end' }
        ]
    };

    const { error: wfError } = await supabase.from('workflows').upsert({
        service_id: serviceId,
        name: 'مسار الموافقات الإدارية',
        is_active: true,
        definition: definition
    }, { onConflict: 'service_id, name' } as any); // Upsert constraints depend on DB, assumed generic or will insert

    if (wfError) {
        // If unique constraint isn't perfect, we might match by name?
        // Let's try to update if exists
        const { data: existWf } = await supabase.from('workflows').select('id').eq('service_id', serviceId).eq('name', 'مسار الموافقات الإدارية').single();
        if (existWf) {
            await supabase.from('workflows').update({ definition }).eq('id', existWf.id);
            console.log("Workflow updated.");
        } else {
            await supabase.from('workflows').insert({
                service_id: serviceId,
                name: 'مسار الموافقات الإدارية',
                is_active: true,
                definition
            });
            console.log("Workflow created.");
        }
    } else {
        console.log("Workflow upserted.");
    }

    console.log("Done.");
}

run();
