/**
 * SLA Calculator Service
 * Handles SLA time calculations, warnings, and escalations
 */

export interface SLAConfig {
    sla_hours: number;
    sla_warning_threshold?: number; // percentage (default 80%)
    escalation_hours?: number;
    business_hours_only?: boolean;
}

export interface SLAStatus {
    total_hours: number;
    elapsed_hours: number;
    remaining_hours: number;
    percentage_used: number;
    is_overdue: boolean;
    needs_warning: boolean;
    needs_escalation: boolean;
    due_at: Date;
}

/**
 * Calculate SLA status for a request step
 */
export function calculateSLAStatus(
    startedAt: Date,
    config: SLAConfig,
    currentTime: Date = new Date()
): SLAStatus {
    const warningThreshold = config.sla_warning_threshold || 80;

    let elapsedHours: number;

    if (config.business_hours_only) {
        elapsedHours = calculateBusinessHours(startedAt, currentTime);
    } else {
        elapsedHours = (currentTime.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
    }

    const totalHours = config.sla_hours;
    const remainingHours = Math.max(0, totalHours - elapsedHours);
    const percentageUsed = (elapsedHours / totalHours) * 100;
    const isOverdue = elapsedHours > totalHours;
    const needsWarning = percentageUsed >= warningThreshold && !isOverdue;
    const needsEscalation = config.escalation_hours
        ? elapsedHours >= config.escalation_hours
        : false;

    const dueAt = new Date(startedAt);
    if (config.business_hours_only) {
        dueAt.setTime(dueAt.getTime() + addBusinessHours(totalHours));
    } else {
        dueAt.setHours(dueAt.getHours() + totalHours);
    }

    return {
        total_hours: totalHours,
        elapsed_hours: elapsedHours,
        remaining_hours: remainingHours,
        percentage_used: Math.min(100, percentageUsed),
        is_overdue: isOverdue,
        needs_warning: needsWarning,
        needs_escalation: needsEscalation,
        due_at: dueAt,
    };
}

/**
 * Calculate business hours between two dates
 * Business hours: 8 AM - 5 PM, Sunday - Thursday
 */
function calculateBusinessHours(start: Date, end: Date): number {
    let current = new Date(start);
    let hours = 0;

    while (current < end) {
        const dayOfWeek = current.getDay();
        const hour = current.getHours();

        // Sunday = 0, Thursday = 4 (business days in Saudi Arabia)
        const isBusinessDay = dayOfWeek >= 0 && dayOfWeek <= 4;
        const isBusinessHour = hour >= 8 && hour < 17;

        if (isBusinessDay && isBusinessHour) {
            const nextHour = new Date(current);
            nextHour.setHours(current.getHours() + 1);

            if (nextHour > end) {
                hours += (end.getTime() - current.getTime()) / (1000 * 60 * 60);
                break;
            } else {
                hours += 1;
            }
        }

        current.setHours(current.getHours() + 1);
    }

    return hours;
}

/**
 * Add business hours to a timestamp
 */
function addBusinessHours(hours: number): number {
    // Simplified: assumes 9 business hours per day
    const businessHoursPerDay = 9;
    const days = Math.ceil(hours / businessHoursPerDay);

    // Add extra time for weekends
    const weeks = Math.floor(days / 5);
    const extraDays = weeks * 2; // 2 weekend days per week

    return (days + extraDays) * 24 * 60 * 60 * 1000;
}

/**
 * Get SLA status color for UI
 */
export function getSLAStatusColor(status: SLAStatus): string {
    if (status.is_overdue) return 'red';
    if (status.needs_warning) return 'orange';
    if (status.percentage_used > 50) return 'yellow';
    return 'green';
}

/**
 * Get SLA status text
 */
export function getSLAStatusText(status: SLAStatus): string {
    if (status.is_overdue) {
        return `متأخر ${Math.floor(status.elapsed_hours - status.total_hours)} ساعة`;
    }
    if (status.needs_warning) {
        return `تحذير: ${Math.floor(status.remaining_hours)} ساعة متبقية`;
    }
    return `${Math.floor(status.remaining_hours)} ساعة متبقية`;
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(hours: number): string {
    if (hours < 1) {
        const minutes = Math.floor(hours * 60);
        return `${minutes} دقيقة`;
    }
    if (hours < 24) {
        return `${Math.floor(hours)} ساعة`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return `${days} يوم${remainingHours > 0 ? ` و ${remainingHours} ساعة` : ''}`;
}
