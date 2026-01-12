
import { createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get('id'); // Can be UUID or Request Number (REQ-...)

    if (!identifier) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    let query = supabase.from('requests').select(`
        *,
        request_events (*)
    `);

    // Determine if input is UUID or Request Number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (isUuid) {
        query = query.eq('id', identifier);
    } else {
        query = query.eq('request_number', identifier);
    }

    const { data: requestData, error } = await query.single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch tasks
    const { data: tasks } = await supabase.from('workflow_tasks').select('*').eq('request_id', requestData.id);

    return NextResponse.json({
        request: requestData,
        events: requestData.request_events,
        tasks: tasks,
        serverTime: new Date().toISOString()
    });
}
