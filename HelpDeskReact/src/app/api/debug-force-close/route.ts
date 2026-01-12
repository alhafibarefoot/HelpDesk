import { createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // e.g. REQ-2025... OR UUID

    if (!id) return NextResponse.json({ error: 'Missing id param. Use ?id=...' });

    const supabase = await createAdminClient();

    // 1. Try to fetch
    let query = supabase.from('requests').select('*');

    // Check if ID is UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
        query = query.eq('id', id);
    } else {
        query = query.eq('request_number', id);
    }

    const { data: req, error: fetchError } = await query.single();

    if (fetchError) return NextResponse.json({ error: 'Fetch failed', details: fetchError, searched_id: id, is_uuid: isUUID });

    console.log("Found request:", req);

    // 2. Try to update - MINIMAL first
    const { data, error: updateError } = await supabase.from('requests').update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
    }).eq('id', req.id).select();

    if (updateError) {
        return NextResponse.json({
            success: false,
            stage: 'Status Update',
            error: updateError,
            msg: updateError.message
        });
    }

    return NextResponse.json({
        success: true,
        message: "Updated successfully",
        data
    });
}
