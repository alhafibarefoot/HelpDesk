import { createClient } from './supabase-server';

export type NotificationType =
    | 'request_created'
    | 'request_approved'
    | 'request_rejected'
    | 'request_returned'
    | 'request_completed'
    | 'task_assigned'
    | 'warning'
    | 'mention'
    | 'info'
    | 'system_alert';

interface NotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityId?: string; // Optional because some notifications might not link to an entity
    entityType?: string;
    link?: string;
    metadata?: Record<string, any>;
}

// Helper to get preferences (using RPC for security/cross-user compatible)
export async function getUserNotificationPreferences(userId: string): Promise<Record<string, boolean>> {
    const supabase = await createClient();

    // Use the secure RPC to fetch preferences
    const { data, error } = await supabase.rpc('get_user_preferences', {
        p_user_id: userId
    });

    if (error) {
        console.error('[NotificationService] Failed to fetch preferences:', error);
        return {};
    }

    // Convert to Record
    const preferences: Record<string, boolean> = {};
    if (data) {
        data.forEach((row: any) => {
            preferences[row.notification_type] = row.enabled;
        });
    }
    return preferences;
}

export async function isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await getUserNotificationPreferences(userId);
    // Default to true if no preference exists
    return preferences[type] !== false;
}

export async function createNotification(params: NotificationParams) {
    // 1. Check Preference
    const enabled = await isNotificationEnabled(params.userId, params.type);
    if (!enabled) {
        // Notification disabled by user preference
        return;
    }

    const supabase = await createClient();

    // Use RPC to bypass RLS for creation (Security Definer)
    const { error } = await supabase.rpc('create_notification', {
        p_user_id: params.userId,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_entity_type: params.entityType || 'request',
        p_entity_id: params.entityId,
        p_link: params.link,
        p_metadata: params.metadata || {}
    });

    if (error) {
        console.error('[NotificationService] Failed to create notification:', error);
    }
}

// Backward compatibility / Helper for Workflow Engine
export async function notifyWorkflowAction(
    userId: string,
    requestId: string,
    actionType: 'assigned' | 'approved' | 'rejected' | 'completed',
    requestTitle: string
) {
    const messages = {
        assigned: { title: 'طلب جديد', message: `تم تعيين طلب "${requestTitle}" لك`, type: 'task_assigned' },
        approved: { title: 'تمت الموافقة', message: `تمت الموافقة على طلبك "${requestTitle}"`, type: 'request_approved' },
        rejected: { title: 'تم الرفض', message: `تم رفض طلبك "${requestTitle}"`, type: 'request_rejected' },
        completed: { title: 'اكتمل الطلب', message: `اكتمل طلبك "${requestTitle}" بنجاح`, type: 'request_completed' },
    } as const;

    const config = messages[actionType];

    await createNotification({
        userId,
        entityId: requestId,
        type: config.type as NotificationType,
        title: config.title,
        message: config.message,
        entityType: 'request',
        link: `/dashboard/user/requests/${requestId}`
    });
}

// Fetchers for UI
// Fetchers for UI - Always User Scoped
export async function getUnreadNotificationsCount() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    return error ? 0 : count || 0;
}

export async function getUserNotifications(limit = 50) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id) // Security check
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id); // Security check
    if (error) throw error;
}

export async function markAllNotificationsAsRead() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    if (error) throw error;
}
