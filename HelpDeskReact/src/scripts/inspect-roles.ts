
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Inspecting Users Table Schema...");
    // Fetch one user to see keys
    const { data: users, error } = await supabase.from('users').select('*').limit(1);

    if (error) {
        console.error("Error fetching users:", error);
    } else {
        if (users && users.length > 0) {
            console.log("Sample User Keys:", Object.keys(users[0]));
        } else {
            console.log("No users found to inspect keys.");
            // Try to insert a dummy to see error if column missing? No, that's noisy.
        }
    }

    console.log("\nInspecting Workflow Definitions...");
    const { data: workflows } = await supabase.from('workflows').select('definition');
    if (workflows) {
        workflows.forEach((w, i) => {
            console.log(`Workflow ${i} Nodes:`);
            const nodes = (w.definition as any)?.nodes || [];
            nodes.forEach((n: any) => {
                // Log ID, Type, and Data.Role
                if (n.type === 'approval' || n.data?.role) {
                    console.log(` - Node [${n.id}] Type: ${n.type}, Label: "${n.data.label}", Role: '${n.data.role}'`);
                }
            });
        });
    }
}

main();
