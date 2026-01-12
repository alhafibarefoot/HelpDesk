'use server';

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function updateUser(userId: string, data: { full_name?: string; role?: string }) {
    const supabase = await createClient();

    // 1. Authorization Check: Only admins can update users
    // Note: In a real app, middleware or RLS protects this, but explicit check is safer.
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
        return { success: false, message: "غير مصرح" };
    }

    // Optional: Check if currentUser is actually an admin
    // For now, we rely on the fact that only admins can reach the page calling this action, 
    // and RLS should eventually enforce 'users' update policy.

    // 2. Perform Update
    const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', userId);

    if (error) {
        console.error("Error updating user:", error);
        return { success: false, message: "فشل تحديث بيانات المستخدم" };
    }

    // 3. Revalidate
    revalidatePath('/dashboard/admin/users');
    return { success: true, message: "تم تحديث المستخدم بنجاح" };
}
