import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminOverview, { StatusCount, PriorityCount, RecentRequest } from "./AdminOverview";

// Local types for raw Supabase responses
type RawStatsRow = {
    status: string;
    priority: string;
};

type RawRecentRequest = {
    id: string;
    request_number: string;
    status: string;
    priority: string;
    created_at: string;
    service: { name: string } | null; // Supabase joins can return null or object
};

export default async function AdminOverviewPage() {
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

    // Allow 'admin' or 'helpdesk_admin'
    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'helpdesk_admin';
    if (!isAdmin) {
        redirect('/dashboard');
    }

    // 3. Data Fetching with Error Handling

    let statusCounts: StatusCount[] = [];
    let priorityCounts: PriorityCount[] = [];
    let hasStatsError = false;

    // A. Fetch Stats (Status & Priority)
    try {
        const { data, error: statsError } = await supabase
            .from('requests')
            .select('status, priority');

        if (statsError) {
            console.error("Admin stats fetch error:", statsError);
            hasStatsError = true;
        } else {
            // Cast strictly to our known shape
            const allRequests = (data || []) as unknown as RawStatsRow[];

            // Compute aggregations in memory
            const statusCountsMap: Record<string, number> = {};
            const priorityCountsMap: Record<string, number> = {};

            allRequests.forEach(r => {
                // Defensive checks just in case DB has nulls
                const status = r.status || 'unknown';
                const priority = r.priority || 'unknown';

                statusCountsMap[status] = (statusCountsMap[status] || 0) + 1;
                priorityCountsMap[priority] = (priorityCountsMap[priority] || 0) + 1;
            });

            statusCounts = Object.entries(statusCountsMap).map(([status, count]) => ({ status, count }));
            priorityCounts = Object.entries(priorityCountsMap).map(([priority, count]) => ({ priority, count }));
        }
    } catch (e) {
        console.error("Unexpected error fetching stats:", e);
        hasStatsError = true;
    }

    let recentRequests: RecentRequest[] = [];
    let hasRecentError = false;

    // B. Fetch Recent Requests
    try {
        const { data, error: recentError } = await supabase
            .from('requests')
            .select(`
                id, 
                request_number, 
                status, 
                priority, 
                created_at,
                service:service_id ( name )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (recentError) {
            console.error("Admin recent requests fetch error:", recentError);
            hasRecentError = true;
        } else {
            // Safe casting with mapping
            const rawData = (data || []) as unknown as RawRecentRequest[];

            recentRequests = rawData.map((r) => ({
                id: r.id,
                request_number: r.request_number,
                status: r.status,
                priority: r.priority,
                created_at: r.created_at,
                service: r.service ? { name: r.service.name } : null
            }));
        }
    } catch (e) {
        console.error("Unexpected error fetching recent requests:", e);
        hasRecentError = true;
    }

    // C. Active Services Count (Non-critical, can default to 0 silently)
    let activeServicesCount = 0;
    try {
        const { count, error } = await supabase
            .from('services')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (!error && count !== null) {
            activeServicesCount = count;
        }
    } catch (e) {
        // Silent fail for this minor metric
        console.error("Error fetching active services count:", e);
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <AdminOverview
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
                recentRequests={recentRequests}
                activeServicesCount={activeServicesCount}
                hasStatsError={hasStatsError}
                hasRecentError={hasRecentError}
            />
        </div>
    );
}
