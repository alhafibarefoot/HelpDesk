'use server'

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { updateRequestStatus } from "../actions";

export interface WorkflowTask {
    id: string;
    request_id: string;
    step_id: string;
    assigned_to_user: string | null;
    assigned_to_role: string | null;
    status: 'pending' | 'completed' | 'cancelled';
    created_at: string;
    request?: {
        request_number: string;
        title?: string;
        status: string;
        service: { name: string; key: string };
    };
}

export async function getUserTasks(userId?: string): Promise<WorkflowTask[]> {
    const supabase = await createClient();

    // Resolve user (if not provided, get current)
    let targetUserId = userId;
    if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        targetUserId = user.id;
    }

    // Get User Role for Role-based tasks
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', targetUserId)
        .single();

    const userRole = userProfile?.role;

    // Phase 2: Delegation Logic

    // Find who has delegated to this user (Active and within Date Range)
    const now = new Date().toISOString();
    const { data: delegations } = await supabase
        .from('delegations')
        .select('from_user_id')
        .eq('to_user_id', targetUserId)
        .eq('is_active', true)
        .lte('start_date', now)
        .gte('end_date', now);

    const delegatedUserIds = delegations?.map(d => d.from_user_id) || [];

    // Fetch roles of delegated users to support Role Delegation
    let delegatedRoles: string[] = [];
    if (delegatedUserIds.length > 0) {
        const { data: dRoles } = await supabase
            .from('users')
            .select('role')
            .in('id', delegatedUserIds);
        delegatedRoles = dRoles?.map(r => r.role).filter(Boolean) as string[] || [];
    }

    const allUserIds = [targetUserId, ...delegatedUserIds];
    const allRoles = [userRole, ...delegatedRoles].filter(Boolean);

    // Construct Query
    // We fetch tasks that are PENDING
    // AND (assigned_to_user IN allUserIds OR assigned_to_role IN allRoles)

    let query = supabase
        .from('workflow_tasks')
        .select(`
            *,
            request:requests (
                request_number,
                status,
                service:services (name, key)
            )
        `)
        .eq('status', 'pending');

    // Using PostgreSQL OR syntax for Supabase
    // or="assigned_to_user.in.(...),assigned_to_role.in.(...)"
    const userFilter = `assigned_to_user.in.(${allUserIds.join(',')})`;
    const roleFilter = allRoles.length > 0 ? `,assigned_to_role.in.(${allRoles.join(',')})` : '';

    query = query.or(userFilter + roleFilter);

    const { data: tasks, error } = await query;

    if (error) {
        console.error("Error fetching tasks:", JSON.stringify(error, null, 2));
        return [];
    }

    return tasks as unknown as WorkflowTask[];
}

export async function completeTask(taskId: string, action: 'approve' | 'reject', comment?: string) {
    const supabase = await createClient();

    // 1. Verify Task Ownership & Existence
    const { data: task, error } = await supabase
        .from('workflow_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

    if (error || !task) {
        throw new Error("المهمة غير موجودة");
    }

    if (task.status !== 'pending') {
        throw new Error("تم إنجاز هذه المهمة مسبقًا");
    }

    const intentStatus = action === 'reject' ? 'مرفوض' : 'قيد التنفيذ';

    const result = await updateRequestStatus(task.request_id, intentStatus, comment);

    if (result.success) {
        revalidatePath('/dashboard/inbox');
        return { success: true };
    } else {
        return result;
    }
}

// ------------------------------------------------------------------
// Delegation Actions
// ------------------------------------------------------------------

export async function getDelegations() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check if admin
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'helpdesk_admin';

    let query = supabase.from('delegations').select(`
        *,
        from_user:from_user_id(full_name, email),
        to_user:to_user_id(full_name, email)
    `);

    // If not admin, only show own delegations (created by me)
    if (!isAdmin) {
        query = query.eq('from_user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching delegations:", error);
        return [];
    }
    return data;
}

export async function createDelegation(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const from_user_id = formData.get('from_user_id') as string || user.id;
    const to_user_id = formData.get('to_user_id') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;
    const reason = formData.get('reason') as string;

    if (!to_user_id || !start_date || !end_date) {
        return { success: false, message: "بيانات ناقصة" };
    }

    const { error } = await supabase.from('delegations').insert({
        from_user_id,
        to_user_id,
        start_date,
        end_date,
        reason,
        is_active: true
    });

    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/dashboard/admin/delegations');
    revalidatePath('/dashboard/inbox');

    return { success: true };
}

export async function cancelDelegation(id: string) {
    const supabase = await createClient();
    await supabase.from('delegations').update({ is_active: false }).eq('id', id);
    revalidatePath('/dashboard/admin/delegations');
    return { success: true };
}
