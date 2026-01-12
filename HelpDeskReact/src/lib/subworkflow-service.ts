import { createClient } from "@/lib/supabase";
import { getWorkflowDefinition, getStartNode } from "./workflow-engine";

export interface SubWorkflowResult {
    subRequestId: string;
    status: 'pending' | 'completed' | 'failed';
}

/**
 * Create and execute a sub-workflow
 */
export async function executeSubWorkflow(
    parentRequestId: string,
    serviceKey: string,
    inheritedData?: Record<string, any>
): Promise<SubWorkflowResult> {
    const supabase = createClient();

    try {
        // 1. Get parent request details
        const { data: parentRequest, error: parentError } = await supabase
            .from('requests')
            .select('requester_id, service_id, title')
            .eq('id', parentRequestId)
            .single();

        if (parentError || !parentRequest) {
            throw new Error('Parent request not found');
        }

        // 2. Get target service
        const { data: targetService, error: serviceError } = await supabase
            .from('services')
            .select('id, name')
            .eq('key', serviceKey)
            .single();

        if (serviceError || !targetService) {
            throw new Error(`Service ${serviceKey} not found`);
        }

        // 3. Get workflow definition and start node
        const workflow = await getWorkflowDefinition(serviceKey);
        const startNode = await getStartNode(serviceKey);

        if (!workflow || !startNode) {
            throw new Error(`Workflow for ${serviceKey} not found`);
        }

        // 4. Create sub-request
        const { data: subRequest, error: createError } = await supabase
            .from('requests')
            .insert({
                request_number: `SUB-${Date.now()}`, // Generate unique number
                service_id: targetService.id,
                requester_id: parentRequest.requester_id,
                title: `${parentRequest.title} - Sub: ${targetService.name}`,
                description: `Sub-workflow created from request ${parentRequestId}`,
                status: 'جديد',
                parent_request_id: parentRequestId,
                is_sub_workflow: true,
                current_step_id: startNode.id,
                sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours default
            })
            .select()
            .single();

        if (createError || !subRequest) {
            throw new Error('Failed to create sub-request');
        }

        // 5. Save inherited form data if provided
        if (inheritedData) {
            await supabase
                .from('request_form_values')
                .insert({
                    request_id: subRequest.id,
                    form_data: inheritedData
                });
        }

        console.log(`[Sub-Workflow] Created sub-request ${subRequest.id} for service ${serviceKey}`);

        return {
            subRequestId: subRequest.id,
            status: 'pending'
        };
    } catch (error) {
        console.error('[Sub-Workflow] Error executing sub-workflow:', error);
        throw error;
    }
}

/**
 * Check if a sub-workflow is completed
 */
export async function isSubWorkflowCompleted(subRequestId: string): Promise<boolean> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('requests')
        .select('status')
        .eq('id', subRequestId)
        .single();

    if (error || !data) {
        return false;
    }

    return data.status === 'مكتمل' || data.status === 'مرفوض';
}

/**
 * Get all sub-workflows for a parent request
 */
export async function getSubWorkflows(parentRequestId: string): Promise<any[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('requests')
        .select('id, request_number, title, status, service(name), created_at, completed_at')
        .eq('parent_request_id', parentRequestId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Sub-Workflow] Error fetching sub-workflows:', error);
        return [];
    }

    return data || [];
}
