import { createClient } from "@/lib/supabase-server";
import { WorkflowDefinition, WorkflowNode } from "@/types";
import { executeAutomatedActions } from "./automation-engine";
import { addMinutes } from "date-fns";
import { SupabaseClient } from "@supabase/supabase-js";
import { evaluateCondition } from "./condition-evaluator";

// ... existing imports

export async function getWorkflowDefinition(serviceKey: string, client?: SupabaseClient): Promise<WorkflowDefinition | null> {
    const supabase = client || await createClient();
    const { data } = await supabase
        .from('services')
        .select(`
            workflows (
                definition
            )
        `)
        .eq('key', serviceKey)
        .single();

    if (!data || !data.workflows || data.workflows.length === 0) return null;
    const wf = Array.isArray(data.workflows) ? data.workflows[0] : data.workflows;
    return wf.definition as WorkflowDefinition;
}


export async function saveServiceWorkflow(serviceKey: string, definition: WorkflowDefinition, client?: SupabaseClient) {
    const supabase = client || await createClient();
    const { data: service } = await supabase.from('services').select('id').eq('key', serviceKey).single();
    if (!service) throw new Error("Service not found");

    const { data: existing } = await supabase.from('workflows').select('id').eq('service_id', service.id).maybeSingle();

    let workflowId: string;

    if (existing) {
        await supabase.from('workflows').update({
            definition,
            updated_at: new Date().toISOString()
        }).eq('id', existing.id);
        workflowId = existing.id;
    } else {
        const { data: newWf } = await supabase.from('workflows').insert({
            service_id: service.id,
            name: `Workflow for ${serviceKey}`,
            definition,
            is_active: true
        }).select().single();
        if (!newWf) throw new Error("Failed to create workflow");
        workflowId = newWf.id;
    }

    // --- Persist Field Permissions ---
    // 1. Clear existing for this workflow
    await supabase.from('step_field_permissions').delete().eq('workflow_id', workflowId);

    // 2. Extract and Bulk Insert
    const permissionsToInsert: any[] = [];
    definition.nodes.forEach(node => {
        if (node.data && node.data.field_permissions) {
            Object.entries(node.data.field_permissions).forEach(([fieldKey, perms]: [string, any]) => {
                permissionsToInsert.push({
                    workflow_id: workflowId,
                    step_id: node.id,
                    field_key: fieldKey,
                    role_type: perms.role_type || 'assignee', // Default for now
                    visible: perms.visible ?? true,
                    editable: perms.editable ?? false,
                    required_override: perms.required ?? null,
                    allowed_roles: null // Can be enhanced later
                });
            });
        }
    });

    if (permissionsToInsert.length > 0) {
        const { error: permError } = await supabase.from('step_field_permissions').insert(permissionsToInsert);
        if (permError) console.error("Failed to save field permissions:", permError);
    }
}

export async function getStartNode(serviceKey: string, definition?: WorkflowDefinition, client?: SupabaseClient): Promise<WorkflowNode | undefined> {
    const def = definition || await getWorkflowDefinition(serviceKey, client);
    if (!def) return undefined;
    return def.nodes.find(n => n.type === 'start');
}

export interface WorkflowActionResult {
    nextStepId: string; // Legacy: Primary next step ID (UUID if we had one, but currently string "1", "2")
    nextStepKey: string; // NEW: The designer key ("1", "2")
    nextStatus: string;
    assignedRole: string | null; // Legacy: Primary role

    // Parallel Support
    activeStepsToCreate: { stepId: string, stepKey: string, assignedRole?: string }[];
    stepsToComplete: string[];
}

// Phase 4: Condition Evaluator - Delegated to separate module

// Helper to check join status
async function areAllPredecessorsCompleted(requestId: string, joinNodeId: string, definition: WorkflowDefinition, currentStepId: string, client?: SupabaseClient): Promise<boolean> {
    const supabase = client || await createClient();

    // 1. Identify all incoming edges to this join node
    const incomingEdges = definition.edges.filter(e => e.target === joinNodeId);
    if (incomingEdges.length === 0) return true;

    // Filter out the branch we are currently on (it is not in DB yet)
    const otherSourceIds = incomingEdges
        .map(e => e.source)
        .filter(sourceId => sourceId !== currentStepId);

    if (otherSourceIds.length === 0) return true; // Only one incoming branch (this one) -> Ready

    // 2. Check status of OTHER predecessors in request_active_steps
    const { data: history } = await supabase
        .from('request_active_steps')
        .select('step_key')
        .eq('request_id', requestId)
        .in('step_key', otherSourceIds)
        .eq('status', 'completed');

    const completedKeys = new Set(history?.map(h => h.step_key) || []);

    // 3. Verify ALL other predecessors are present in completed history
    return otherSourceIds.every(id => completedKeys.has(id));
}

export async function processWorkflowAction(
    requestId: string,
    serviceKey: string,
    currentStepId: string,
    action: 'approve' | 'reject' | 'complete',
    formData: any = {},
    client?: SupabaseClient
): Promise<WorkflowActionResult> {
    const def = await getWorkflowDefinition(serviceKey, client);
    if (!def) throw new Error("Workflow definition not found");

    let currentNode = def.nodes.find(n => n.id === currentStepId);

    // Auto-resolve 'start' if passed literally
    if (!currentNode && currentStepId === 'start') {
        currentNode = def.nodes.find(n => n.type === 'start') || def.nodes[0];
        if (currentNode) {
            currentStepId = currentNode.id;
        }
    }

    if (!currentNode) throw new Error(`Invalid current step: ${currentStepId}`);

    // Default Result
    const result: WorkflowActionResult = {
        nextStepId: currentStepId,
        nextStepKey: currentStepId, // The Designer Key
        nextStatus: 'قيد التنفيذ',
        assignedRole: null,
        activeStepsToCreate: [],
        stepsToComplete: [currentStepId]
    };

    if (currentNode.type === 'end') {
        result.nextStatus = 'مكتمل';
        result.stepsToComplete = []; // End doesn't complete itself in the loop usually? Actually yes.
        return result;
    }

    // --- Transition Logic ---
    const potentialEdges = def.edges.filter(e => e.source === currentStepId);
    let validEdges: typeof potentialEdges = [];

    if (currentNode.type === 'parallel_fork' && action === 'approve') {
        // Fork: Take all conditional matches (or all if no condition)
        validEdges = potentialEdges.filter(e => {
            if (e.condition) return evaluateCondition(e.condition, formData);
            return true;
        });
    } else {
        // Normal / Join / Action
        const matchedEdge = potentialEdges.find(e => {
            if (action === 'reject') {
                return (e.label === 'reject' || e.condition === 'reject');
            }
            if (action === 'complete') return true;
            if (action === 'approve') {
                if (e.label === 'reject' || e.condition === 'reject') return false;
                if (e.condition) return evaluateCondition(e.condition, formData);
                return true;
            }
            return false;
        });

        if (matchedEdge) validEdges = [matchedEdge];
    }

    if (validEdges.length === 0) {
        if (action === 'reject') {
            result.nextStatus = 'مرفوض';
            return result;
        }
        if (action === 'complete') {
            result.nextStatus = 'مكتمل';
            return result;
        }
        throw new Error("No valid transition found.");
    }

    // 2. Determine Next Nodes from Edges
    const nextNodes = validEdges.map(e => def.nodes.find(n => n.id === e.target)).filter(Boolean) as WorkflowNode[];

    // 3. Process Next Nodes
    const activeStepsToCreate: { stepId: string, stepKey: string, assignedRole?: string }[] = [];

    for (const nextNode of nextNodes) {
        if (nextNode.type === 'parallel_join') {
            // Check if we can proceed past the join
            // We pass currentStepId to ignore it in DB check (as we are completing it now)
            // Use injected client for checks too
            const isReady = await areAllPredecessorsCompleted(requestId, nextNode.id, def, currentStepId, client);

            if (isReady) {
                activeStepsToCreate.push({
                    stepId: nextNode.id,
                    stepKey: nextNode.id,
                    assignedRole: nextNode.data?.role
                });
            }
        } else {
            // Normal Node or Fork Target
            activeStepsToCreate.push({
                stepId: nextNode.id,
                stepKey: nextNode.id,
                assignedRole: nextNode.data?.role
            });
        }
    }

    result.activeStepsToCreate = activeStepsToCreate;

    // 4. Legacy Maps (Pick result from first branch if available)
    if (activeStepsToCreate.length > 0) {
        result.nextStepId = activeStepsToCreate[0].stepId;
        result.nextStepKey = activeStepsToCreate[0].stepKey;
        result.assignedRole = activeStepsToCreate[0].assignedRole || null;

        const firstNode = def.nodes.find(n => n.id === result.nextStepId);
        if (firstNode) {
            if (firstNode.type === 'end') result.nextStatus = 'مكتمل';
            else if (firstNode.type === 'approval') result.nextStatus = 'بانتظار الموافقة';
            else result.nextStatus = 'قيد التنفيذ';
        }
    } else {
        // No next steps (e.g. Join Waiting)
        // We keep status as is usually, or ensure it's not 'completed'
        result.nextStatus = 'قيد التنفيذ';
        // We do NOT update nextStepId if we are waiting.
        // Legacy: Maybe keep it as current? But current is completed due to 'stepsToComplete'.
        // This is tricky for legacy single-pointer. 
        // If we really support parallel, legacy 'current_step_id' is just an approximation.
        // We'll set it to the last completed step or null?
        // Let's keep it as is, or use a placeholder 'waiting_join'?
        // Safest: Keep it at current, but effectively it's done. 
        // Actually, for DB integrity, if we have no active steps, the request is stalled.
        // But in Parallel, we might have OTHER branches active.
        // So we should pick ANOTHER active step from DB if available?
        // This is Phase 3 stuff. For now, defaulting to currentStepId prevents crashes.
    }

    try {
        if (activeStepsToCreate.length > 0) {
            await executeAutomatedActions(serviceKey, currentStepId, 'on_' + action, requestId, formData);
            for (const step of activeStepsToCreate) {
                await executeAutomatedActions(serviceKey, step.stepId, 'on_enter', requestId, formData);
            }
        }
    } catch (e) {
        console.error("Automation Error ignored:", e);
    }

    return result;
}

// Phase 3: SLA Calculator
export async function calculateStepDeadline(serviceKey: string, stepKey: string, client?: SupabaseClient): Promise<Date | null> {
    const supabase = client || await createClient();

    // 1. Get Workflow ID
    const { data: service } = await supabase
        .from('services')
        .select('workflows(id)')
        .eq('key', serviceKey)
        .single();

    const workflowId = service?.workflows && Array.isArray(service.workflows)
        ? service.workflows[0]?.id
        : (service?.workflows as any)?.id;

    if (!workflowId) return null;

    // 2. Get SLA
    const { data: sla } = await supabase
        .from('workflow_slas')
        .select('duration_minutes')
        .eq('workflow_id', workflowId)
        .eq('step_key', stepKey)
        .single();

    if (sla && sla.duration_minutes) {
        return addMinutes(new Date(), sla.duration_minutes);
    }

    return null;
}
