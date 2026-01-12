import { createClient } from "@/lib/supabase-server";
import { EnhancedRequestList } from "@/components/dashboard/enhanced-request-list";
import { Request } from "@/types";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { redirect } from "next/navigation";

export default async function AllRequestsPage() {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch Real Requests
    // We select request_form_values to extract the title since 'title' column might describe the request details
    const { data: rawRequests, error } = await supabase
        .from('requests')
        .select(`
            *,
            service:services!inner (
                id,
                key,
                name,
                default_sla_hours,
                is_active,
                created_at
            ),
            request_form_values (
                form_data
            )
        `)
        // Filter by current user to enforce "My Requests" view
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[AllRequestsPage] Fetch error:', error);
    }

    // Map and Normalize Data
    const requests: Request[] = (rawRequests || []).map((r: any) => {
        // Extract title from form data or fallback
        const formData = r.request_form_values?.[0]?.form_data || {};
        const displayTitle = formData.title || formData.reason || formData.subject || r.title || `${r.service.name}`;

        return {
            id: r.id,
            request_number: r.request_number,
            service_id: r.service_id,
            requester_id: r.requester_id,
            title: displayTitle, // Computed title
            status: r.status,
            priority: r.priority,
            created_at: r.created_at,
            updated_at: r.updated_at,
            service: {
                ...r.service,
                // Ensure required Service properties
                is_active: r.service.is_active ?? true
            }
        };
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto py-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/dashboard"
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <h1 className="text-3xl font-bold text-gray-900">طلباتي</h1>
                        </div>
                        <p className="text-gray-600">
                            إدارة ومتابعة جميع طلباتك في مكان واحد
                        </p>
                    </div>
                    {requests.length > 0 && (
                        <Link href="/dashboard/services">
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                إنشاء طلب جديد
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Requests List */}
                <EnhancedRequestList requests={requests} />
            </div>
        </div>
    );
}