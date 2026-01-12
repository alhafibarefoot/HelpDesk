
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("🚀 Starting RBAC 2.0 Migration...");

    // ---------------------------------------------------------
    // 0. Migrate Users (RBAC)
    // ---------------------------------------------------------
    console.log("--- Migrating User Roles ---");
    const roleMappings = {
        'موظف': 'employee',
        'مدير': 'admin',
        'مسؤول خدمة': 'service_owner',
        'مشرف': 'approver'
    };

    for (const [oldRole, newRole] of Object.entries(roleMappings)) {
        const { data, error: updateError } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('role', oldRole)
            .select('id');

        const count = updateError ? 0 : data?.length || 0;

        if (updateError) {
            console.error(`Failed to migrate role '${oldRole}':`, updateError);
        } else {
            console.log(`Migrated '${oldRole}' -> '${newRole}': ${count} users affected.`);
        }
    }

    // ---------------------------------------------------------
    // 1. Fetch all workflows (JSON Migration)
    // ---------------------------------------------------------
    console.log("--- Migrating Workflow JSON ---");
    const { data: workflows, error } = await supabase
        .from('workflows')
        .select('*');

    if (error) {
        console.error("Error fetching workflows:", error);
        return;
    }

    console.log(`Found ${workflows.length} workflows.`);

    let updatedCount = 0;

    for (const workflow of workflows) {
        let definition = workflow.definition;
        let modified = false;

        // Naive but effective string replacement for this specific task
        const jsonString = JSON.stringify(definition);

        // Only modify if it contains old Arabic roles
        // Regex checking for "role": "OldRole"
        if (jsonString.includes('"role":"موظف"') || jsonString.includes('"role": "موظف"') ||
            jsonString.includes('"role":"مدير"') || jsonString.includes('"role": "مدير"') ||
            jsonString.includes('مسؤول خدمة') || jsonString.includes('مشرف')) {

            console.log(`Migrating roles for workflow: ${workflow.name}`);
            const newString = jsonString
                .replace(/"role"\s*:\s*"موظف"/g, '"role": "employee"')
                .replace(/"role"\s*:\s*"مدير"/g, '"role": "admin"')
                .replace(/"role"\s*:\s*"مسؤول خدمة"/g, '"role": "service_owner"')
                .replace(/"role"\s*:\s*"مشرف"/g, '"role": "approver"');

            definition = JSON.parse(newString);
            modified = true;
        }

        if (modified) {
            // Update DB
            const { error: updateError } = await supabase
                .from('workflows')
                .update({ definition })
                .eq('id', workflow.id);

            if (updateError) {
                console.error(`Failed to update workflow ${workflow.id}:`, updateError);
            } else {
                console.log(`✅ Updated workflow ${workflow.name}`);
                updatedCount++;
            }
        }
    }

    console.log(`Migration Complete. Updated ${updatedCount} workflows.`);
}

migrate();
