import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminServicesList from "./AdminServicesList";

// --- Types ---

// Internal raw Supabase row
type RawServiceRow = {
    id: string;
    name: string;
    key: string;
    description: string | null;
    is_active: boolean;
    status?: string;
    created_at: string;
    updated_at: string | null;
};

// UI-facing type (exported for client components)
export interface AdminService {
    id: string;
    name: string;
    key: string;
    description: string | null;
    is_active: boolean;
    status: 'draft' | 'active' | 'suspended' | 'maintenance' | 'archived';
    created_at: string;
    updated_at?: string;
}

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // 2. Admin Role Check
    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    // Only 'admin' or 'helpdesk_admin'
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'helpdesk_admin';
    if (!isAdmin) {
        redirect('/dashboard');
    }

    // 3. Fetch Services
    let services: AdminService[] = [];
    let hasError = false;

    try {
        const { data, error } = await supabase
            .from('services')
            .select('id, name, key, description, is_active, status, created_at, updated_at') // Added status
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[AdminServicesPage] Error fetching services:', JSON.stringify(error, null, 2));
            hasError = true;
        } else {
            // Map raw rows to strict AdminService type
            const rawRows = (data || []) as unknown as RawServiceRow[];

            services = rawRows.map(row => ({
                id: row.id,
                name: row.name,
                key: row.key,
                description: row.description,
                is_active: row.is_active,
                status: row.status as any || (row.is_active ? 'active' : 'draft'), // Fallback if migration not run yet
                created_at: row.created_at,
                updated_at: row.updated_at || undefined
            }));
        }
    } catch (e) {
        console.error('[AdminServicesPage] Unexpected error:', e);
        hasError = true;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <AdminServicesList services={services} hasError={hasError} />
        </div>
    );
}
