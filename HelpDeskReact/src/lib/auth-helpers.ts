import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { User, SupabaseClient } from "@supabase/supabase-js";

// Helper type for the return value
interface AdminContext {
    supabase: SupabaseClient;
    user: User;
    role: string | null;
    isAdmin: boolean;
}

/**
 * Standard Admin Page Guard
 * Redirects to /auth/login or /dashboard if unauthorized.
 * Returns valid supabase client and user context if authorized.
 */
export async function requireAdminPage(): Promise<AdminContext> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role ?? null;
    const isAdmin = role === "admin" || role === "helpdesk_admin";

    if (!isAdmin) {
        redirect("/dashboard");
    }

    return { supabase, user, role, isAdmin };
}

/**
 * Standard Admin Action Guard
 * Does NOT redirect (server actions use return values).
 * Returns context if authorized, or throws Error if unauthorized.
 */
export async function requireAdminAction(): Promise<AdminContext> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("يجب تسجيل الدخول");
    }

    const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role ?? null;
    const isAdmin = role === "admin" || role === "helpdesk_admin";

    if (!isAdmin) {
        throw new Error("غير مصرح لك بتنفيذ هذه العملية.");
    }

    return { supabase, user, role, isAdmin };
}
