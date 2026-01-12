import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminRequestsList, { AdminListRequest } from "./AdminRequestsList";

// Raw Supabase response type (Cleaned up: removed updated_at)
type RawAdminRequestRow = {
    id: string;
    request_number: string;
    status: string;
    priority: string | null;
    created_at: string;
    service: { name: string; key: string } | null;
    requester: { full_name: string | null; email: string | null } | null;
};

export default async function AdminRequestsPage() {
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

    // 3. Fetch All Requests
    let requests: AdminListRequest[] = [];
    let hasError = false;

    try {
        const { data, error } = await supabase
            .from('requests')
            .select(`
                id, 
                request_number, 
                status, 
                priority, 
                created_at, 
                service:service_id ( name, key ),
                requester:requester_id ( full_name, email )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[AdminRequestsPage] Error fetching requests:', JSON.stringify(error, null, 2));
            hasError = true;
        } else {
            // Map raw data to UI-friendly type
            const rawRows = (data || []) as unknown as RawAdminRequestRow[];

            requests = rawRows.map(row => ({
                id: row.id,
                request_number: row.request_number,
                status: row.status,
                priority: row.priority,
                created_at: row.created_at,
                // updated_at removed
                serviceName: row.service?.name || 'غير معروف',
                serviceKey: row.service?.key || null,
                requesterName: row.requester?.full_name || 'مستخدم غير معروف',
                requesterEmail: row.requester?.email || null
            }));
        }
    } catch (e) {
        console.error('[AdminRequestsPage] Unexpected error:', e);
        hasError = true;
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <AdminRequestsList
                requests={requests}
                hasError={hasError}
            />
        </div>
    );
}
