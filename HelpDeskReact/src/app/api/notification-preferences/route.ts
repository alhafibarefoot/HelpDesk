import { createClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use standard select because RLS allows reading own preferences
    const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('notification_type, enabled')
        .eq('user_id', user.id)
        .eq('channel', 'in_app');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const preferences: Record<string, boolean> = {};
    data?.forEach((row: any) => {
        preferences[row.notification_type] = row.enabled;
    });

    return NextResponse.json({ preferences });
}

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationType, enabled } = body;

    if (!notificationType || typeof enabled !== 'boolean') {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Upsert
    const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(
            {
                user_id: user.id,
                notification_type: notificationType,
                channel: 'in_app',
                enabled: enabled,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id, notification_type, channel' }
        );

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
