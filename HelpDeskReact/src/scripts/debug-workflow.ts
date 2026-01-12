
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Get Service ID/Key for 'delivery'
    const { data: services } = await supabase.from('services').select('*');
    if (!services) { console.log("No services found"); return; }

    console.log("Services found:", services.map(s => s.key));

    const service = services.find(s => s.key === 'delivery-request'); // Corrected key
    if (!service) { console.log("Delivery service not found"); return; }

    console.log(`Inspecting Service: ${service.key} (ID: ${service.id})`);

    // 2. Get Workflow
    const { data: workflow } = await supabase
        .from('workflows')
        .select('*')
        .eq('service_id', service.id)
        .single();

    if (!workflow) {
        console.log("No workflow found for service");
        return;
    }
    console.log(`Found Workflow ID: ${workflow.id}`);

    const nodes = workflow.definition.nodes;
    console.log("Nodes Count:", nodes.length);
    nodes.forEach((n: any) => {
        console.log(`- ID: ${n.id}, Type: ${n.type}, Label: ${n.data?.label}, Role: ${n.data?.role}`);
    });

    // Check Edges
    const edges = workflow.definition.edges;
    console.log("Edges Count:", edges.length);
    edges.forEach((e: any) => {
        console.log(`  Source: ${e.source} -> Target: ${e.target}`);
    });
}

main();
