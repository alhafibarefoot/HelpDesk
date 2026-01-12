
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';
import { processWorkflowAction, getWorkflowDefinition, getStartNode } from "../lib/workflow-engine";

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mock createClient for the imported engine if needed, 
// but since engine imports from @/lib/supabase-server, we might need to rely on it verifying env vars.
// However, the engine likely uses `createClient` from `@/lib/supabase-server` which uses `cookies()`.
// This script runs in Node, so `cookies()` will fail.
// We need to Mock `createClient` in the engine OR (easier) modify the engine to accept a client, 
// OR just reproduce the logic here.

// REPRODUCING LOGIC FOR DEBUGGING
// We will copy-paste the minimal logic to see where it fails, 
// using a raw supabase client.

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const requestId = '99dc063f-9568-4539-8da4-85ed69d33ba4'; // From screenshot
    console.log(`Debugging Request: ${requestId}`);

    // 1. Fetch Request
    const { data: request, error } = await supabase
        .from('requests')
        .select('*, service:services(key)')
        .eq('id', requestId)
        .single();

    if (error || !request) {
        console.error("Request fetch failed", error);
        return;
    }

    const serviceKey = request.service.key;
    console.log(`Service Key: ${serviceKey}`);
    console.log(`Current Data:`, request.form_data);

    // 2. Fetch Workflow
    const { data: service } = await supabase.from('services').select('workflows(definition)').eq('key', serviceKey).single();
    const definition = service?.workflows[0]?.definition;

    if (!definition) {
        console.error("Workflow Definition not found");
        return;
    }

    // 3. Find Start Node
    const startNode = definition.nodes.find((n: any) => n.type === 'start');
    if (!startNode) {
        console.error("Start Node not found");
        return;
    }
    console.log("Start Node:", startNode);

    // 4. Simulate processWorkflowAction(..., startNode.id, 'complete', ...)
    const currentStepId = startNode.id;
    const action = 'complete';
    const formData = request.form_data;

    console.log(`\n--- Simulating Action: ${action} from Step ${currentStepId} ---`);

    const potentialEdges = definition.edges.filter((e: any) => e.source === currentStepId);
    console.log("Potential Edges:", potentialEdges);

    const validEdges = potentialEdges.filter((e: any) => {
        if (action === 'complete') return true;
        // ... (other logic)
        return false;
    });

    console.log("Valid Edges:", validEdges);

    if (validEdges.length === 0) {
        console.log("NO VALID EDGES FOUND!");
        if (action === 'complete') console.log("Result would be: 'مكتمل' (Status Completed)");
        return;
    }

    // Determine Next Nodes
    const nextNodes = validEdges.map((e: any) => definition.nodes.find((n: any) => n.id === e.target)).filter(Boolean);
    console.log("Next Nodes:", nextNodes);

    if (nextNodes.length === 0) {
        console.log("No Next Nodes found despite edge?");
    }
}

main();
