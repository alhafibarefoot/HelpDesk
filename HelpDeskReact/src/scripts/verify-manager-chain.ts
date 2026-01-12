
import { createClient } from "@supabase/supabase-js";
import { resolveStepAssignee } from "../lib/workflow-resolver";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role to bypass policies if needed, or anon if sufficient

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("=== Verifying Manager Chain Resolution ===\n");

    // 1. Find a user with a Direct Manager
    const { data: usersWithManager, error: err1 } = await supabase
        .from('users')
        .select('id, email, direct_manager_id')
        .not('direct_manager_id', 'is', null)
        .limit(1);

    if (err1) { console.error("Error fetching users:", err1); return; }

    if (usersWithManager && usersWithManager.length > 0) {
        const user = usersWithManager[0];
        console.log(`[TEST 1] Testing DIRECT_MANAGER for user ${user.email} (ID: ${user.id})`);
        console.log(`         Expected Manager ID: ${user.direct_manager_id}`);

        try {
            const result = await resolveStepAssignee('mock-req-id', 'DIRECT_MANAGER', user.id, supabase);
            console.log(`         Result: ${result.assigneeId}`);
            if (result.assigneeId === user.direct_manager_id) {
                console.log("         ✅ SUCCESS: Direct Manager resolved correctly.");
            } else {
                console.log("         ❌ FAILURE: Resolved ID mismatch.");
            }
        } catch (e) {
            console.error("         ❌ EXCEPTION:", e);
        }
    } else {
        console.log("[TEST 1] SKIPPED: No users with direct_manager_id found.");
    }

    // 2. Find a user with Manager Level 2 (Chain)
    // We need a user U1 where U1.manager -> U2, and U2.manager -> U3
    // We can do this by fetching all users and mapping in memory for simplicity if dataset is small
    const { data: allUsers } = await supabase.from('users').select('id, email, direct_manager_id');
    const userMap = new Map((allUsers || []).map(u => [u.id, u]));

    let foundChain = false;
    if (allUsers) {
        for (const u1 of allUsers) {
            if (u1.direct_manager_id) {
                const u2 = userMap.get(u1.direct_manager_id);
                if (u2 && u2.direct_manager_id) {
                    const u3 = userMap.get(u2.direct_manager_id); // The Level 2 Manager

                    if (u3) {
                        foundChain = true;
                        console.log(`\n[TEST 2] Testing MANAGER_LEVEL_2 for user ${u1.email}`);
                        console.log(`         Manager (L1): ${u2.email} (${u2.id})`);
                        console.log(`         Manager (L2): ${u3.email} (${u3.id}) <-- EXPECTED`);

                        try {
                            const result = await resolveStepAssignee('mock-req-id', 'MANAGER_LEVEL_2', u1.id, supabase);
                            console.log(`         Result: ${result.assigneeId}`);
                            if (result.assigneeId === u3.id) {
                                console.log("         ✅ SUCCESS: Level 2 Manager resolved correctly.");
                            } else {
                                console.log(`         ❌ FAILURE: Expected ${u3.id}, got ${result.assigneeId}`);
                            }
                        } catch (e) {
                            console.error("         ❌ EXCEPTION:", e);
                        }
                        break; // Test one case
                    }
                }
            }
        }
    }

    if (!foundChain) {
        console.log("\n[TEST 2] SKIPPED: No 2-level manager chain found in data.");
    }

    // 3. Test Broken Chain
    // Find a user with NO manager
    const userNoManager = allUsers?.find(u => !u.direct_manager_id);
    if (userNoManager) {
        console.log(`\n[TEST 3] Testing BROKEN CHAIN (DIRECT_MANAGER) for user ${userNoManager.email}`);
        try {
            await resolveStepAssignee('mock-req-id', 'DIRECT_MANAGER', userNoManager.id, supabase);
            console.log("         ❌ FAILURE: Expected error, but got result.");
        } catch (e: any) {
            if (e.message.includes('Hierarchy broken') || e.message.includes('Could not fetch user profile')) {
                console.log(`         ✅ SUCCESS: Caught expected error: ${e.message}`);
            } else {
                console.log(`         ⚠️ CAUGHT UNEXPECTED ERROR: ${e.message}`);
            }
        }
    }

    // 4. Test Broken Level 2 Chain
    // User U1 has manager U2, but U2 has NO manager. Requesting Level 2 should fail.
    let foundBrokenL2 = false;
    if (allUsers) {
        for (const u1 of allUsers) {
            if (u1.direct_manager_id) {
                const u2 = userMap.get(u1.direct_manager_id);
                if (u2 && !u2.direct_manager_id) {
                    foundBrokenL2 = true;
                    console.log(`\n[TEST 4] Testing BROKEN CHAIN (LEVEL 2) for user ${u1.email}`);
                    console.log(`         Manager (L1): ${u2.email} (Has NO manager)`);

                    try {
                        await resolveStepAssignee('mock-req-id', 'MANAGER_LEVEL_2', u1.id, supabase);
                        console.log("         ❌ FAILURE: Expected error, but got result.");
                    } catch (e: any) {
                        console.log(`         ✅ SUCCESS: Caught expected error: ${e.message}`);
                    }
                    break;
                }
            }
        }
    }
    if (!foundBrokenL2) {
        console.log("\n[TEST 4] SKIPPED: No broken L2 chain found (User->Manager->|).");
    }
}

main().catch(e => console.error(e));
