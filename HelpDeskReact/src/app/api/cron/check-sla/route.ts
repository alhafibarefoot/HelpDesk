import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // In real prod, verify secret. For dev, maybe relax or check env.
        // return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    console.log("[SLA Access] Checking violations at", now);

    // 1. Find Breached Requests (deadline passed, not completed, status not already breached)
    // Note: status != 'breached' refers to sla_status column
    const { data: breachedRequests, error } = await supabase
        .from('requests')
        .select('id, request_number, step_deadline, current_step_id, assigned_role, service_id, services(key, workflows(id))')
        .lt('step_deadline', now)
        .neq('status', 'مكتمل')
        .neq('status', 'مرفوض')
        .neq('sla_status', 'breached');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[SLA Check] Found ${breachedRequests?.length} violations.`);

    const results = [];

    for (const req of breachedRequests || []) {
        // Update Status
        await supabase.from('requests')
            .update({ sla_status: 'breached' })
            .eq('id', req.id);

        // Fetch Escalation Action
        // Find SLA config for this step
        // We need workflow ID. 
        // Fix for TS Error: Treat services as array returned from join
        // @ts-ignore
        const service = Array.isArray(req.services) ? req.services[0] : req.services;
        const workflowId = service?.workflows?.[0]?.id;

        if (workflowId) {
            const { data: sla } = await supabase
                .from('workflow_slas')
                .select('*')
                .eq('workflow_id', workflowId)
                .eq('step_id', req.current_step_id)
                .single();

            if (sla && sla.escalation_action) {
                // Perform Escalation
                console.log(`[SLA Escalation] Request ${req.id}: ${sla.escalation_action}`);

                // Example: Notify Supervisor
                if (sla.escalation_action === 'notify_supervisor' || sla.escalation_action === 'send_email') {
                    // Notify Admin (simplification)
                    // In real app, find supervisor of assigned_role
                    await createNotification({
                        userId: 'admin', // Placeholder or broadcast
                        type: 'system_alert',
                        title: `تجاوز SLA: ${req.request_number}`,
                        message: `الطلب تأخر عن الموعد المحدد في مرحلة ${req.current_step_id}`,
                        entityId: req.id,
                        link: `/dashboard/admin/requests/${req.id}`
                    });
                }

                // Log Event
                await supabase.from('request_events').insert({
                    request_id: req.id,
                    event_type: 'sla_breach',
                    performed_by: null, // System
                    payload: {
                        step_id: req.current_step_id,
                        deadline: req.step_deadline,
                        action_taken: sla.escalation_action
                    }
                });

                results.push({ id: req.id, action: sla.escalation_action });
            }
        }
    }

    return NextResponse.json({
        success: true,
        processed: results.length,
        results
    });
}
