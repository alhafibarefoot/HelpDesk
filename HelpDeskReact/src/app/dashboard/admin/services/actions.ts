"use server";

import { createClient } from "@/lib/supabase-server";

// --- Types ---

export interface ServiceFormData {
    id?: string;
    name: string;
    key: string;
    description?: string | null;
    is_active: boolean;
    status?: 'draft' | 'active' | 'suspended' | 'maintenance' | 'archived';
}

export interface ActionResult {
    success: boolean;
    message: string;
}

// --- Auth Helper ---

async function requireAdminUser() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { supabase, user: null, role: null, isAdmin: false };
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role ?? null;
    const isAdmin = role === "admin" || role === "helpdesk_admin";

    return { supabase, user, role, isAdmin };
}

// --- Actions ---

export async function upsertService(form: ServiceFormData): Promise<ActionResult> {
    const { supabase, isAdmin } = await requireAdminUser();

    if (!isAdmin) {
        return { success: false, message: "غير مصرح لك بتنفيذ هذه العملية." };
    }

    // Validation
    if (!form.name.trim() || !form.key.trim()) {
        return { success: false, message: "يرجى تعبئة جميع الحقول الإلزامية." };
    }

    try {
        if (form.id) {
            // Update
            const { error } = await supabase
                .from("services")
                .update({
                    name: form.name.trim(),
                    key: form.key.trim(),
                    description: form.description?.trim() || null,
                    is_active: form.is_active,
                    status: form.status || (form.is_active ? 'active' : 'draft'),
                })
                .eq("id", form.id);

            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase
                .from("services")
                .insert({
                    name: form.name.trim(),
                    key: form.key.trim(),
                    description: form.description?.trim() || null,
                    is_active: form.is_active,
                    status: form.status || (form.is_active ? 'active' : 'draft'),
                });

            if (error) throw error;
        }

        return { success: true, message: "تم حفظ بيانات الخدمة بنجاح." };

    } catch (error) {
        console.error("[upsertService] Error:", error);
        return { success: false, message: "تعذر حفظ بيانات الخدمة، يرجى المحاولة لاحقًا." };
    }
}

export async function updateServiceStatus(id: string, isActiveOrStatus: boolean | string): Promise<ActionResult> {
    const { supabase, isAdmin } = await requireAdminUser();

    if (!isAdmin) {
        return { success: false, message: "غير مصرح لك بتنفيذ هذه العملية." };
    }

    try {
        let updatePayload: any = {};

        if (typeof isActiveOrStatus === 'boolean') {
            // Legacy toggle support
            updatePayload = {
                is_active: isActiveOrStatus,
                status: isActiveOrStatus ? 'active' : 'suspended'
            };
        } else {
            // New status support
            const status = isActiveOrStatus;
            updatePayload = {
                status: status,
                is_active: status === 'active' // Only 'active' status is truly active
            };
        }

        const { error } = await supabase
            .from("services")
            .update(updatePayload)
            .eq("id", id);

        if (error) throw error;

        return { success: true, message: "تم تحديث حالة الخدمة بنجاح." };

    } catch (error) {
        console.error("[toggleServiceStatus] Error:", error);
        return { success: false, message: "تعذر تحديث حالة الخدمة، يرجى المحاولة لاحقًا." };
    }
}

export async function deleteService(id: string): Promise<ActionResult> {
    const { supabase, isAdmin } = await requireAdminUser();

    if (!isAdmin) {
        return { success: false, message: "غير مصرح لك بتنفيذ هذه العملية." };
    }

    try {
        const { error } = await supabase
            .from("services")
            .delete()
            .eq("id", id);

        if (error) {
            // Check for foreign key violation
            if (error.code === '23503') {
                return { success: false, message: "لا يمكن حذف الخدمة لوجود طلبات مرتبطة بها. يمكنك تعطيلها بدلاً من ذلك." };
            }
            throw error;
        }

        return { success: true, message: "تم حذف الخدمة بنجاح." };

    } catch (error) {
        console.error("[deleteService] Error:", error);
        return { success: false, message: "تعذر حذف الخدمة، يرجى المحاولة لاحقًا." };
    }
}
