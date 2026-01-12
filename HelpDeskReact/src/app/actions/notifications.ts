
'use server'

import { getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead, getUserNotifications } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

export async function getUnreadCountAction() {
    return await getUnreadNotificationsCount();
}

export async function markAsReadAction(notificationId: string) {
    try {
        await markNotificationAsRead(notificationId);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function markAllAsReadAction() {
    try {
        await markAllNotificationsAsRead();
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function getNotificationsAction(limit = 50) {
    return await getUserNotifications(limit);
}
