import { createClient } from "@/lib/supabase";

/**
 * Track a new branch in a parallel gateway
 */
export async function createWorkflowBranch(
    requestId: string,
    gatewayNodeId: string,
    branchNodeId: string
): Promise<string> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workflow_branches')
        .insert({
            request_id: requestId,
            gateway_node_id: gatewayNodeId,
            branch_node_id: branchNodeId,
            status: 'pending'
        })
        .select()
        .single();

    if (error) {
        console.error('[Workflow Branches] Error creating branch:', error);
        throw error;
    }

    return data.id;
}

/**
 * Mark a branch as completed
 */
export async function completeBranch(
    requestId: string,
    gatewayNodeId: string,
    branchNodeId: string
): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
        .from('workflow_branches')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
        .eq('gateway_node_id', gatewayNodeId)
        .eq('branch_node_id', branchNodeId);

    if (error) {
        console.error('[Workflow Branches] Error completing branch:', error);
        throw error;
    }
}

/**
 * Check if all branches from a gateway are completed
 */
export async function areAllBranchesCompleted(
    requestId: string,
    gatewayNodeId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workflow_branches')
        .select('status')
        .eq('request_id', requestId)
        .eq('gateway_node_id', gatewayNodeId);

    if (error) {
        console.error('[Workflow Branches] Error checking branches:', error);
        return false;
    }

    if (!data || data.length === 0) return false;

    return data.every(branch => branch.status === 'completed');
}

/**
 * Check if any branch from a gateway is completed (for OR gateways)
 */
export async function isAnyBranchCompleted(
    requestId: string,
    gatewayNodeId: string
): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('workflow_branches')
        .select('status')
        .eq('request_id', requestId)
        .eq('gateway_node_id', gatewayNodeId);

    if (error) {
        console.error('[Workflow Branches] Error checking branches:', error);
        return false;
    }

    if (!data || data.length === 0) return false;

    return data.some(branch => branch.status === 'completed');
}
