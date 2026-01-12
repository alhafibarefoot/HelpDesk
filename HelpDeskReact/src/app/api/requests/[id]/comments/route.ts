import { createClient, createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// list comments
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminSupabase = await createAdminClient();

    const { data: rawComments, error } = await adminSupabase
        .from('request_comments')
        .select('*')
        .eq('request_id', id)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Manual Join
    let comments = [];
    if (rawComments && rawComments.length > 0) {
        const userIds = Array.from(new Set(rawComments.map(c => c.user_id).filter(Boolean)));
        let usersMap: Record<string, any> = {};

        if (userIds.length > 0) {
            const { data: users } = await adminSupabase
                .from('users')
                .select('id, full_name, role, avatar_url')
                .in('id', userIds);
            users?.forEach(u => { usersMap[u.id] = u; });
        }

        comments = rawComments.map(c => ({
            ...c,
            user: usersMap[c.user_id] || { full_name: 'مستخدم', role: 'unknown' },
            // Backward compatibility for components expecting 'author'
            author: usersMap[c.user_id] || { full_name: 'مستخدم', role: 'unknown' }
        }));
    }

    return NextResponse.json(comments);
}

// create comment
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

    // Fetch author details BEFORE insert to satisfy legacy 'author_name' NOT NULL constraint
    const { data: author } = await adminSupabase
        .from('users')
        .select('full_name, role, avatar_url')
        .eq('id', user.id)
        .single();

    // meaningful fallback: DB name -> Metadata name -> Metadata name (short) -> Email username -> 'مستخدم'
    const authorName = author?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'مستخدم';

    const authorRole = author?.role || 'user';
    const authorAvatar = author?.avatar_url || user.user_metadata?.avatar_url;

    // Insert comment using Admin Client to bypass RLS
    // We provide fields for BOTH legacy (v1) and new (v2) schemas to be safe
    const { data: newComment, error } = await adminSupabase
        .from('request_comments')
        .insert({
            request_id: id,

            // New Schema
            user_id: user.id,
            content: content,

            // Legacy Schema Compatibility
            author_id: user.id,
            author_name: authorName,
            comment_text: content
        })
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log Event using Admin Client
    await adminSupabase.from("request_events").insert({
        request_id: id,
        event_type: 'comment_added',
        performed_by: user.id,
        payload: {
            comment_id: newComment.id,
            content: content.length > 50 ? content.substring(0, 50) + '...' : content
        }
    });

    const responseData = {
        ...newComment,
        user: {
            full_name: authorName,
            role: authorRole,
            avatar_url: authorAvatar
        },
        author: {
            full_name: authorName,
            role: authorRole,
            avatar_url: authorAvatar
        } // Keep author for compatibility
    };

    return NextResponse.json(responseData);
}
