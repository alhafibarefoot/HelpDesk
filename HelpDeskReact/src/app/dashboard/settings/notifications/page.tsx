
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import NotificationsForm from "./notifications-form";

export default async function NotificationSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Load initial preferences
    // Using simple select is fine here because users are reading their own
    const { data } = await supabase
        .from('user_notification_preferences')
        .select('notification_type, enabled')
        .eq('user_id', user.id)
        .eq('channel', 'in_app');

    const preferences: Record<string, boolean> = {};
    if (data) {
        data.forEach((row: any) => {
            preferences[row.notification_type] = row.enabled;
        });
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl" dir="rtl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">تفضيلات الإشعارات</h1>
                <p className="text-gray-500 mt-2">
                    تحكم في أنواع الإشعارات التي ترغب باستلامها داخل النظام.
                </p>
            </div>

            <NotificationsForm initialPreferences={preferences} />
        </div>
    );
}
