import { createClient } from "@/lib/supabase";
import { createNotification } from "./notifications";

export interface OverdueRequest {
    id: string;
    request_number: string;
    title: string;
    requester_id: string;
    service_id: string;
    current_step_id: string | null;
    sla_due_at: string;
    escalation_level: number;
    last_reminder_sent_at: string | null;
}

/**
 * Get all overdue requests
 */
export async function getOverdueRequests(): Promise<OverdueRequest[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('requests')
        .select('id, request_number, title, requester_id, service_id, current_step_id, sla_due_at, escalation_level, last_reminder_sent_at')
        .not('status', 'in', '(مكتمل,مرفوض,ملغي)')
        .not('sla_due_at', 'is', null)
        .lt('sla_due_at', new Date().toISOString());

    if (error) {
        console.error('[Escalation] Error fetching overdue requests:', error);
        return [];
    }

    return data || [];
}

/**
 * Get requests that need reminders (approaching SLA)
 */
export async function getRequestsNeedingReminders(hoursBeforeSLA: number = 4): Promise<OverdueRequest[]> {
    const supabase = createClient();

    const reminderThreshold = new Date();
    reminderThreshold.setHours(reminderThreshold.getHours() + hoursBeforeSLA);

    const { data, error } = await supabase
        .from('requests')
        .select('id, request_number, title, requester_id, service_id, current_step_id, sla_due_at, escalation_level, last_reminder_sent_at')
        .not('status', 'in', '(مكتمل,مرفوض,ملغي)')
        .not('sla_due_at', 'is', null)
        .lt('sla_due_at', reminderThreshold.toISOString())
        .gt('sla_due_at', new Date().toISOString())
        .or('last_reminder_sent_at.is.null,last_reminder_sent_at.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
        console.error('[Escalation] Error fetching requests needing reminders:', error);
        return [];
    }

    return data || [];
}

/**
 * Escalate a request
 */
export async function escalateRequest(
    requestId: string,
    reason: string = 'تجاوز الوقت المحدد (SLA)'
): Promise<void> {
    const supabase = createClient();

    // 1. Update request escalation level
    const { data: request, error: updateError } = await supabase
        .from('requests')
        .update({
            escalation_level: supabase.rpc('increment', { row_id: requestId }),
            escalated_at: new Date().toISOString(),
            status: 'متأخر'
        })
        .eq('id', requestId)
        .select('id, request_number, title, requester_id, escalation_level, service(name)')
        .single();

    if (updateError) {
        console.error('[Escalation] Error updating request:', updateError);
        throw updateError;
    }

    // 2. Log escalation history
    await supabase
        .from('escalation_history')
        .insert({
            request_id: requestId,
            escalation_level: request.escalation_level,
            reason
        });

    // 3. Send notification to requester
    await createNotification({
        userId: request.requester_id,
        entityId: requestId,
        type: 'warning',
        title: 'تنبيه: طلب متأخر',
        message: `طلبك "${request.title}" (${request.request_number}) تجاوز الوقت المحدد وتم تصعيده.`,
        link: `/dashboard/user/requests/${requestId}`
    });

    // TODO: Notify manager/supervisor based on escalation rules
    console.log(`[Escalation] Request ${request.request_number} escalated to level ${request.escalation_level}`);
}

/**
 * Send reminder for approaching SLA
 */
export async function sendSLAReminder(requestId: string): Promise<void> {
    const supabase = createClient();

    const { data: request, error } = await supabase
        .from('requests')
        .select('id, request_number, title, requester_id, sla_due_at, service(name)')
        .eq('id', requestId)
        .single();

    if (error || !request) {
        console.error('[Escalation] Error fetching request for reminder:', error);
        return;
    }

    // Calculate hours remaining
    const hoursRemaining = Math.round(
        (new Date(request.sla_due_at).getTime() - Date.now()) / (1000 * 60 * 60)
    );

    // Send notification
    await createNotification({
        userId: request.requester_id,
        entityId: requestId,
        type: 'warning',
        title: 'تذكير: اقتراب موعد الاستحقاق',
        message: `طلبك "${request.title}" (${request.request_number}) سينتهي خلال ${hoursRemaining} ساعة.`,
        link: `/dashboard/user/requests/${requestId}`
    });

    // Update last reminder sent time
    await supabase
        .from('requests')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', requestId);

    console.log(`[Escalation] Reminder sent for request ${request.request_number}`);
}

/**
 * Main scheduler function - check and process overdue requests
 */
export async function processOverdueRequests(): Promise<{
    escalated: number;
    reminded: number;
}> {
    console.log('[Escalation] Starting overdue requests check...');

    // 1. Send reminders for approaching SLA
    const requestsNeedingReminders = await getRequestsNeedingReminders(4);
    for (const request of requestsNeedingReminders) {
        try {
            await sendSLAReminder(request.id);
        } catch (error) {
            console.error(`[Escalation] Error sending reminder for ${request.id}:`, error);
        }
    }

    // 2. Escalate overdue requests
    const overdueRequests = await getOverdueRequests();
    for (const request of overdueRequests) {
        try {
            await escalateRequest(request.id);
        } catch (error) {
            console.error(`[Escalation] Error escalating ${request.id}:`, error);
        }
    }

    console.log(`[Escalation] Processed ${requestsNeedingReminders.length} reminders and ${overdueRequests.length} escalations`);

    return {
        escalated: overdueRequests.length,
        reminded: requestsNeedingReminders.length
    };
}
