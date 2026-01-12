import { WorkflowNode, WorkflowEdge, ServiceStatus, WorkflowDefinition } from "@/types";
import { createClient } from "@/lib/supabase";
import { createWorkflowBranch, completeBranch, areAllBranchesCompleted, isAnyBranchCompleted } from "./workflow-branches";

// ... (keep all existing functions)

// New function to save workflow by service ID directly
export async function saveServiceWorkflowById(serviceId: string, serviceKey: string, definition: WorkflowDefinition) {
    const supabase = createClient();

    console.log('[saveServiceWorkflowById] Saving workflow for service ID:', serviceId);

    // Check if workflow exists
    const { data: existingWorkflow, error: workflowFetchError } = await supabase
        .from('workflows')
        .select('id')
        .eq('service_id', serviceId)
        .maybeSingle();

    if (workflowFetchError) {
        console.error('[saveServiceWorkflowById] Error fetching workflow:', workflowFetchError);
        throw new Error(`Failed to fetch workflow: ${workflowFetchError.message}`);
    }

    if (existingWorkflow) {
        console.log('[saveServiceWorkflowById] Updating existing workflow:', existingWorkflow.id);
        const { error: updateError } = await supabase
            .from('workflows')
            .update({ definition })
            .eq('id', existingWorkflow.id);

        if (updateError) {
            console.error('[saveServiceWorkflowById] Error updating workflow:', updateError);
            throw new Error(`Failed to update workflow: ${updateError.message}`);
        }
    } else {
        console.log('[saveServiceWorkflowById] Creating new workflow for service:', serviceId);
        const { error: insertError } = await supabase
            .from('workflows')
            .insert({
                service_id: serviceId,
                name: `Workflow for ${serviceKey}`,
                definition,
                is_active: true
            });

        if (insertError) {
            console.error('[saveServiceWorkflowById] Error inserting workflow:', insertError);
            throw new Error(`Failed to insert workflow: ${insertError.message}`);
        }
    }

    console.log('[saveServiceWorkflowById] Workflow saved successfully');
    return true;
}
