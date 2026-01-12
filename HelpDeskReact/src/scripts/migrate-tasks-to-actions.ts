
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("Loaded Env Vars keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error("CRITICAL ERROR: No Service Role Key found in environment variables. Cannot bypass RLS.");
    console.error("Please ensure SUPABASE_SERVICE_ROLE_KEY is set in .env.local");
    process.exit(1);
}

try {
    const start = supabaseKey.indexOf('.') + 1;
    const end = supabaseKey.lastIndexOf('.');
    const payload = supabaseKey.substring(start, end);
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    console.log("Using Key Role:", decoded.role);
} catch (e) {
    console.log("Could not decode key (might not be JWT).");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Starting migration...");

    // 1. Get the Service
    const { data: services } = await supabase.from('services').select('id, key').eq('key', 'delivery-request');
    if (!services || services.length === 0) {
        console.log("Service 'delivery-request' not found.");
        return;
    }
    const service = services[0];
    console.log(`Found service: ${service.key} (${service.id})`);

    // 2. Get the Workflow
    const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('service_id', service.id)
        .single();

    if (!workflow) {
        console.log("Workflow not found.");
        return;
    }

    const definition = workflow.definition;
    const nodes = definition.nodes;
    let updatedCount = 0;

    // 3. Update 'task' nodes to 'action'
    const updatedNodes = nodes.map((node: any) => {
        if (node.type === 'task') {
            console.log(`Migrating node ${node.id} (${node.data?.label}) from 'task' to 'action'`);
            updatedCount++;
            return {
                ...node,
                type: 'action'
            };
        }
        return node;
    });

    if (updatedCount === 0) {
        console.log("No 'task' nodes found to migrate.");
        return;
    }

    // 4. Save changes
    const updatedDefinition = {
        ...definition,
        nodes: updatedNodes
    };

    console.log(`Attempting to update Workflow ${workflow.id} with ${updatedCount} modified nodes...`);
    console.log(`Using Key: ${supabaseKey?.substring(0, 10)}...`);

    const { data: updateData, error, count } = await supabase
        .from('workflows')
        .update({ definition: updatedDefinition })
        .eq('id', workflow.id)
        .select();

    if (error) {
        console.error("Error updating workflow:", error);
    } else {
        console.log(`Update call success. Rows affected: ${updateData?.length}`);
        if (updateData?.length === 0) {
            console.error("WARNING: Update succeeded but returned 0 rows. RLS might be blocking the update.");
        }
    }
}

main();
