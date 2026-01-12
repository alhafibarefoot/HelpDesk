import { createClient } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function executeAutomatedActions(
    serviceKey: string,
    nodeId: string,
    trigger: string,
    requestId: string,
    context: any
) {
    const supabase = await createClient();
    console.log(`[Automation] Checking actions for ${serviceKey} at node ${nodeId} (${trigger})...`);

    // 1. Resolve Service ID & Workflow ID
    const { data: service } = await supabase
        .from('services')
        .select('id, workflows(id)')
        .eq('key', serviceKey)
        .single();

    if (!service || !service.workflows || service.workflows.length === 0) {
        console.warn("[Automation] Workflow not found for service:", serviceKey);
        return;
    }

    const workflowId = Array.isArray(service.workflows) ? service.workflows[0].id : (service.workflows as any).id;

    // 2. Fetch Actions
    const { data: actions, error } = await supabase
        .from('workflow_actions')
        .select('*')
        .eq('workflow_id', workflowId)
        .eq('node_id', nodeId)
        .eq('trigger_type', trigger);

    if (error) {
        console.error("[Automation] Error fetching actions:", error);
        return;
    }

    if (!actions || actions.length === 0) {
        return;
    }

    console.log(`[Automation] Found ${actions.length} actions to execute.`);

    // 3. Execute Actions
    for (const action of actions) {
        try {
            await executeAction(action, requestId, context);
        } catch (err) {
            console.error(`[Automation] Action ${action.id} failed:`, err);
            // Log failure to events?
            await supabase.from('request_events').insert({
                request_id: requestId,
                event_type: 'automation_error',
                performed_by: null, // System
                payload: {
                    action_id: action.id,
                    error: err instanceof Error ? err.message : String(err)
                }
            });
        }
    }
}

async function executeAction(actionDef: any, requestId: string, context: any) {
    const supabase = await createClient();
    const config = actionDef.config || {};
    console.log(`[Automation] Executing ${actionDef.action_type}`, config);

    switch (actionDef.action_type) {
        case 'send_email':
            // Stub for email sending
            // In a real app, use Resend or similar
            // For now, we'll log it and maybe send a notification (in-app)
            await createNotification({
                userId: config.to_user_id || 'system', // We need a valid user ID or specific logic
                type: 'info',
                title: config.subject || 'Automated Email',
                message: config.body || 'No content',
                entityId: requestId,
                link: `/dashboard/user/requests/${requestId}`
            });
            break;

        case 'set_field':
            if (config.field && config.value) {
                // Update request_form_values or properties?
                // Simplest is generic field update if supported, or just log it.
                // We'll update form_data in requests table.

                // Fetch current form data first
                const { data: req } = await supabase.from('requests').select('form_data').eq('id', requestId).single();
                if (req) {
                    const newFormData = { ...req.form_data, [config.field]: config.value };
                    await supabase.from('requests')
                        .update({ form_data: newFormData })
                        .eq('id', requestId);

                    // Log the update
                    await supabase.from('request_events').insert({
                        request_id: requestId,
                        event_type: 'field_update',
                        payload: {
                            field: config.field,
                            value: config.value,
                            source: 'automation'
                        }
                    });
                }
            }
            break;

        case 'webhook':
            if (config.url) {
                fetch(config.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requestId, context, ...config.payload })
                }).catch(e => console.error("Webhook failed", e));
            }
            break;

        default:
            console.warn("Unknown action type:", actionDef.action_type);
    }
}
