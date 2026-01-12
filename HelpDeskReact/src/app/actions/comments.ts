'use server';

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { createNotification, NotificationType } from "@/lib/notifications";

export async function addRequestComment(
    requestId: string,
    content: string,
    isInternal: boolean = false
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    // 1. Parse Mentions
    // Regex to find @Name or @[Name] or @Email
    // This is a naive implementation. Ideally frontend sends IDs.
    // We will scan for @username patterns and attempt to resolve them.
    // For this phase, we require exact email matches for simplicity if typing manually: @user@example.com
    // OR we assume the Frontend passed "mentions" explicitly? 
    // The prompt says "Parses @mentions in the content".
    // Let's implement a heuristic: Look for @Strings. Fetch users matching that.

    // Better approach: Regex for @(name)
    // We will extract all @matches, then query users table.

    const mentionRegex = /@(\S+)/g;
    const matches = content.match(mentionRegex);
    const mentionedUserIds: string[] = [];

    if (matches && matches.length > 0) {
        const potentialNames = matches.map(m => m.substring(1)); // remove @

        // Find users where email or full_name matches
        // Note: Full name with spaces won't be caught by simple \S+. 
        // We'll rely on the UI to format mentions as @Email or @FirstName for now or pass logic.
        // Assuming @Email for robust parsing without UI autocomplete IDs.

        const { data: users } = await supabase
            .from('users')
            .select('id, email, full_name')
            .or(`email.in.(${potentialNames.map(n => `"${n}"`).join(',')}),full_name.in.(${potentialNames.map(n => `"${n}"`).join(',')})`);

        if (users) {
            users.forEach(u => mentionedUserIds.push(u.id));
        }
    }

    // 2. Prepare Data (Hybrid Schema Support)
    // We need to fetch author name first for legacy support
    const { data: authorData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
    const authorName = authorData?.full_name || 'مستخدم';

    // 3. Insert Comment
    const { data: comment, error } = await supabase
        .from('request_comments')
        .insert({
            request_id: requestId,
            user_id: user.id,
            content,
            is_internal: isInternal,
            mentions: mentionedUserIds,

            // Legacy
            author_id: user.id,
            author_name: authorName,
            comment_text: content
        })
        .select()
        .single();

    if (error) throw error;

    // 3. Log Event
    await supabase.from('request_events').insert({
        request_id: requestId,
        event_type: 'comment_added',
        performed_by: user.id,
        payload: { comment_id: comment.id, is_internal: isInternal }
    });

    // 4. Notifications
    // Notify Request Owner (if not self)
    const { data: request } = await supabase.from('requests').select('requester_id, title').eq('id', requestId).single();

    if (request && request.requester_id !== user.id && !isInternal) {
        await createNotification({
            userId: request.requester_id,
            type: 'warning', // Generic alert
            title: 'تعليق جديد',
            message: `قام ${user.email} بإضافة تعليق على طلبك "${request.title}"`,
            entityId: requestId,
            entityType: 'request',
            link: `/dashboard/user/requests/${requestId}`
        });
    }

    // Notify Mentions
    for (const mentionedId of mentionedUserIds) {
        if (mentionedId !== user.id) {
            await createNotification({
                userId: mentionedId,
                type: 'mention',
                title: 'تمت الإشارة إليك',
                message: `قام ${user.email} بالإشارة إليك في تعليق على طلب "${request?.title}"`,
                entityId: requestId,
                entityType: 'request',
                link: `/dashboard/user/requests/${requestId}`
            });

            // Log notification event
            await supabase.from('request_events').insert({
                request_id: requestId,
                event_type: 'mention_notification',
                performed_by: user.id,
                payload: { mentioned_user_id: mentionedId }
            });
        }
    }

    revalidatePath(`/dashboard/admin/requests/${requestId}`);
    revalidatePath(`/dashboard/inbox`);
    revalidatePath(`/dashboard/user/requests/${requestId}`);

    return comment;
}

export async function getRequestComments(requestId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('request_comments')
        .select(`
            *,
            user:users (
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false }); // Newest first

    if (error) throw error;
    return data;
}
