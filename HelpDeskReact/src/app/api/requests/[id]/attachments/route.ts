import { createClient, createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const BUCKET_NAME = 'request-attachments';

// GET: List attachments
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Authorization: Fetch request details
    const { data: reqData, error: reqError } = await supabase
        .from('requests')
        .select('requester_id, assigned_role')
        .eq('id', id)
        .single();

    if (reqError || !reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    // Check permissions
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    const isRequester = reqData.requester_id === user.id;
    const isAssignee = userProfile?.role === reqData.assigned_role;

    if (!isRequester && !isAssignee) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Query DB
    const { data: attachments, error: dbError } = await adminSupabase
        .from('request_attachments')
        .select('id, file_name, file_size, file_type, storage_path, created_at, uploaded_by')
        .eq('request_id', id)
        .order('created_at', { ascending: false });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    // 2.5 Fetch Uploader Details manually (since FK is to auth.users, not public.users)
    const userIds = Array.from(new Set(attachments.map((a: any) => a.uploaded_by)));
    let userMap: Map<string, any> = new Map();

    if (userIds.length > 0) {
        const { data: usersData } = await adminSupabase
            .from('users')
            .select('id, full_name')
            .in('id', userIds);

        if (usersData) {
            userMap = new Map(usersData.map(u => [u.id, u]));
        }
    }

    // 3. Generate Signed URLs and attach uploader info
    const attachmentsWithUrls = await Promise.all(attachments.map(async (file: any) => {
        const { data } = await adminSupabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(file.storage_path, 3600); // 1 hour expiry

        const uploader = userMap.get(file.uploaded_by);

        return {
            ...file,
            url: data?.signedUrl,
            uploader: uploader ? { full_name: uploader.full_name } : undefined
        };
    }));

    return NextResponse.json(attachmentsWithUrls);
}

// POST: Upload attachment
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    // Use Admin Client for storage and DB writes to bypass potential RLS conflicts
    const adminSupabase = await createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Authorization (Same as GET)
    const { data: reqData } = await supabase
        .from('requests')
        .select('requester_id, assigned_role')
        .eq('id', id)
        .single();

    if (!reqData) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    const isRequester = reqData.requester_id === user.id;
    const isAssignee = userProfile?.role === reqData.assigned_role;

    if (!isRequester && !isAssignee) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    // 3. Upload to Storage
    const timestamp = Date.now();
    // Sanitize filename to strict alphanumeric to avoid issues
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${id}/${timestamp}-${sanitizedName}`;

    const { error: uploadError } = await adminSupabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
        });

    if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // 4. Insert into DB
    const { data: attachment, error: insertError } = await adminSupabase
        .from('request_attachments')
        .insert({
            request_id: id,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
            uploaded_by: user.id
        })
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 5. Log Event
    await adminSupabase.from("request_events").insert({
        request_id: id,
        event_type: 'attachment_added',
        performed_by: user.id,
        payload: { file_name: file.name, file_size: file.size, attachment_id: attachment.id }
    });

    return NextResponse.json(attachment);
}

// DELETE: Delete attachment
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { attachment_id } = await request.json();
    if (!attachment_id) return NextResponse.json({ error: "Attachment ID required" }, { status: 400 });

    // 1. Get Attachment Details
    const { data: attachment, error: fetchError } = await adminSupabase
        .from('request_attachments')
        .select('*')
        .eq('id', attachment_id)
        .single();

    if (fetchError || !attachment) {
        return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // 2. Check Permissions
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'helpdesk_admin';
    const isUploader = attachment.uploaded_by === user.id;

    if (!isAdmin && !isUploader) {
        return NextResponse.json({ error: "Forbidden: You can only delete your own files" }, { status: 403 });
    }

    // 3. Delete from Storage
    const { error: storageError } = await adminSupabase.storage
        .from(BUCKET_NAME)
        .remove([attachment.storage_path]);

    if (storageError) {
        console.error("Storage delete error:", storageError);
    }

    // 4. Delete from DB
    const { error: deleteError } = await adminSupabase
        .from('request_attachments')
        .delete()
        .eq('id', attachment_id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 5. Log Event
    await adminSupabase.from("request_events").insert({
        request_id: id,
        event_type: 'attachment_deleted',
        performed_by: user.id,
        payload: { file_name: attachment.file_name }
    });

    return NextResponse.json({ success: true });
}
