/**
 * Auto-Escalation Engine
 * Monitors SLA and automatically escalates overdue tasks
 */

export interface EscalationRule {
    id: string;
    trigger: 'sla_warning' | 'sla_overdue' | 'no_action';
    threshold_hours: number;
    escalate_to_role: 'manager' | 'senior_manager' | 'director' | 'admin';
    notification_channels: ('email' | 'sms' | 'in_app')[];
    auto_reassign: boolean;
    is_active: boolean;
}

export interface EscalationChain {
    level: number;
    from_role: string;
    to_role: string;
    trigger_after_hours: number;
}

export const DEFAULT_ESCALATION_CHAIN: EscalationChain[] = [
    { level: 1, from_role: 'موظف', to_role: 'مدير', trigger_after_hours: 24 },
    { level: 2, from_role: 'مدير', to_role: 'مشرف', trigger_after_hours: 48 },
    { level: 3, from_role: 'مشرف', to_role: 'مدير عام', trigger_after_hours: 72 }
];

/**
 * Check if task should be escalated
 */
export function shouldEscalate(
    elapsedHours: number,
    slaHours: number,
    warningThreshold: number = 80
): { needsWarning: boolean; needsEscalation: boolean } {
    const percentageUsed = (elapsedHours / slaHours) * 100;

    return {
        needsWarning: percentageUsed >= warningThreshold && percentageUsed < 100,
        needsEscalation: percentageUsed >= 100
    };
}

/**
 * Get next escalation level
 */
export function getNextEscalationLevel(
    currentRole: string,
    chain: EscalationChain[] = DEFAULT_ESCALATION_CHAIN
): EscalationChain | null {
    const nextLevel = chain.find(c => c.from_role === currentRole);
    return nextLevel || null;
}

/**
 * Calculate escalation urgency
 */
export function calculateEscalationUrgency(
    overdueHours: number
): 'low' | 'medium' | 'high' | 'critical' {
    if (overdueHours < 4) return 'low';
    if (overdueHours < 12) return 'medium';
    if (overdueHours < 24) return 'high';
    return 'critical';
}

/**
 * Get escalation message template
 */
export function getEscalationMessage(
    requestTitle: string,
    overdueHours: number,
    currentAssignee: string
): string {
    const urgency = calculateEscalationUrgency(overdueHours);

    const templates = {
        low: `تنبيه: الطلب "${requestTitle}" متأخر ${Math.floor(overdueHours)} ساعة. المسؤول الحالي: ${currentAssignee}`,
        medium: `⚠️ تحذير: الطلب "${requestTitle}" متأخر ${Math.floor(overdueHours)} ساعة. يرجى المتابعة الفورية.`,
        high: `🔴 عاجل: الطلب "${requestTitle}" متأخر ${Math.floor(overdueHours)} ساعة. يتطلب تدخل فوري!`,
        critical: `🚨 حرج جداً: الطلب "${requestTitle}" متأخر ${Math.floor(overdueHours)} ساعة. تصعيد طارئ!`
    };

    return templates[urgency];
}

/**
 * Format escalation notification
 */
export interface EscalationNotification {
    title: string;
    message: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    actionRequired: string;
    dueDate: Date;
}

export function formatEscalationNotification(
    requestId: string,
    requestTitle: string,
    overdueHours: number,
    fromRole: string,
    toRole: string
): EscalationNotification {
    const urgency = calculateEscalationUrgency(overdueHours);

    return {
        title: `تصعيد طلب: ${requestTitle}`,
        message: getEscalationMessage(requestTitle, overdueHours, fromRole),
        urgency,
        actionRequired: `تم تصعيد الطلب من ${fromRole} إلى ${toRole}. يرجى المراجعة والإجراء الفوري.`,
        dueDate: new Date() // Should be calculated based on new SLA
    };
}

/**
 * Escalation monitoring service
 * This would run as a background job (cron)
 */
export interface TaskToMonitor {
    request_id: string;
    step_id: string;
    title: string;
    assigned_to: string;
    assigned_role: string;
    started_at: Date;
    sla_hours: number;
    warning_threshold: number;
}

export function monitorTasks(tasks: TaskToMonitor[]): {
    warnings: TaskToMonitor[];
    escalations: TaskToMonitor[];
} {
    const now = new Date();
    const warnings: TaskToMonitor[] = [];
    const escalations: TaskToMonitor[] = [];

    tasks.forEach(task => {
        const elapsedMs = now.getTime() - task.started_at.getTime();
        const elapsedHours = elapsedMs / (1000 * 60 * 60);

        const { needsWarning, needsEscalation } = shouldEscalate(
            elapsedHours,
            task.sla_hours,
            task.warning_threshold
        );

        if (needsEscalation) {
            escalations.push(task);
        } else if (needsWarning) {
            warnings.push(task);
        }
    });

    return { warnings, escalations };
}
