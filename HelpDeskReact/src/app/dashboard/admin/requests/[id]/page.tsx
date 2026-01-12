import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminRequestDetails, { AdminRequest, AdminRequestLog } from "./AdminRequestDetails";
import { getStepFieldPermissions } from "@/app/actions/permissions";
import { applyStepPermissions } from "@/lib/form/runtime-adapter";
import { UserRole, FormSchema, RequestEvent } from "@/types";

interface Props {
    params: Promise<{ id: string }>;
}

// Local types for raw query results to ensure type safety without 'any'
type RawRequest = {
    id: string;
    request_number: string;
    status: string;
    priority: string;
    created_at: string;
    form_data: unknown; // Can be JSON object or string or null
    requester_id: string;
    service: { name: string; key: string } | null;
    requester: { full_name: string | null; email: string | null } | null;
    current_step_id: string | null;
    form_schema_snapshot: unknown;
}

type RawAction = {
    id: string;
    action_type: string;
    comment: string | null;
    created_at: string;
    actor_id: string | null;
    from_step_id: string | null;
    to_step_id: string | null;
    actor: { full_name: string | null } | null;
    // Note: Supabase sometimes returns arrays for 1:1 if not explicitly single, 
    // but here we expect single object due to joins, or possibly array if using .select('..., actor(...)'). 
    // Supabase JS client usually flattens if it's a foreign key relation, but let's be safe.
}

export default async function AdminRequestDetailsPage({ params }: Props) {
    const { id } = await params;
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

    // 3. Fetch Request Details
    const { data: requestData, error: reqError } = await supabase
        .from('requests')
        .select(`
            id, request_number, status, priority, created_at, form_data, requester_id, current_step_id,
            form_schema_snapshot,
            service: service_id(name, key),
            requester: requester_id(full_name, email)
            `)
        .eq('id', id)
        .single();

    if (reqError || !requestData) {
        return (
            <div className="p-12 text-center" dir="rtl">
                <h2 className="text-xl font-bold text-gray-700">الطلب غير موجود</h2>
                <p className="text-gray-500 mt-2">عذراً، لم نتمكن من العثور على تفاصيل هذا الطلب.</p>
            </div>
        );
    }

    // 4. Fetch Actions Log
    const { data: actionsData, error: actionsError } = await supabase
        .from('request_actions')
        .select(`
            id, action_type, comment, created_at, actor_id, from_step_id, to_step_id,
            actor: actor_id(full_name)
            `)
        .eq('request_id', id)
        .order('created_at', { ascending: false });

    if (actionsError) {
        console.error("Error fetching logs:", actionsError);
        // We continue without logs rather than blocking the whole page
    }

    // 4.5 Fetch Request Events (Timeline)
    const { data: eventsData, error: eventsError } = await supabase
        .from('request_events')
        .select(`
            id, request_id, step_id, event_type, performed_by, performed_at, payload,
            performer: performed_by(full_name)
        `)
        .eq('request_id', id)
        .order('performed_at', { ascending: false });

    if (eventsError) {
        console.error("Error fetching events:", eventsError);
    }

    // Convert to RequestEvent type
    const events: RequestEvent[] = (eventsData || []).map((ev: any) => ({
        ...ev,
        performer: ev.performer // ensure join is preserved
    }));

    // 4.6 Fetch Active Steps (Parallel Support)
    // We need workflow definition to map IDs to Names
    let activeSteps: any[] = [];
    const safeServiceKey = (requestData as any).service?.key || (Array.isArray((requestData as any).service) ? (requestData as any).service[0]?.key : null);

    if (safeServiceKey) {
        // We import getWorkflowDefinition dynamically or from lib
        // Since this file imports from actions/permissions and lib/form, we can import engine
        const { getWorkflowDefinition } = await import("@/lib/workflow-engine");
        const def = await getWorkflowDefinition(safeServiceKey);

        const { data: asData } = await supabase
            .from('request_active_steps')
            .select('*')
            .eq('request_id', id)
            .eq('status', 'active');

        activeSteps = (asData || []).map(s => {
            const node = def?.nodes.find(n => n.id === s.step_id);
            return {
                stepId: s.step_id,
                name: node?.data?.label || 'Unknown Step',
                role: node?.data?.role,
                startedAt: s.started_at
            };
        });
    }

    // 5. Map Data to Strict Types
    const rawReq = requestData as unknown as RawRequest;

    // Ensure form_data is a record or null
    let safeFormData: Record<string, unknown> | null = null;
    if (rawReq.form_data && typeof rawReq.form_data === 'object' && !Array.isArray(rawReq.form_data)) {
        safeFormData = rawReq.form_data as Record<string, unknown>;
    }

    // Helper to get service object safely
    const rawService = (rawReq as any).service;
    const serviceObj = Array.isArray(rawService) ? rawService[0] : rawService;

    const adminRequest: AdminRequest = {
        id: rawReq.id,
        request_number: rawReq.request_number,
        status: rawReq.status,
        priority: rawReq.priority,
        created_at: rawReq.created_at,
        form_data: safeFormData,
        service: serviceObj ? { name: serviceObj.name, key: serviceObj.key } : null,
        requester: rawReq.requester ? { full_name: rawReq.requester.full_name, email: rawReq.requester.email } : null
    };

    // --- Workflow & Permissions Logic ---
    let runtimeSchema: any = null;

    // 1. Get Service Schema
    let schema: FormSchema | null = null;

    // Strategy A: Use Snapshot (Preferred for version stability)
    if (rawReq.form_schema_snapshot) {
        schema = rawReq.form_schema_snapshot as FormSchema;
    }
    // Strategy B: Fallback to Live Service Schema
    else if (safeServiceKey) {
        const { data: serviceData } = await supabase
            .from('services')
            .select('form_schema')
            .eq('key', safeServiceKey)
            .single();
        if (serviceData?.form_schema) {
            schema = serviceData.form_schema as FormSchema;
        }
    }

    if (schema) {
        // 2. Get Step Permissions if current_step_id exists
        if (rawReq.current_step_id) {
            try {
                const permissions = await getStepFieldPermissions(rawReq.current_step_id);
                // 3. User Role
                const userRole = userProfile?.role as UserRole || 'admin';

                // 4. Apply Schema Adapter
                runtimeSchema = applyStepPermissions(schema, permissions, [userRole]);
            } catch (err) {
                console.error("Failed to apply permissions:", err);
                runtimeSchema = schema; // Fallback to full schema
            }
        } else {
            runtimeSchema = schema;
        }
    }

    // Safe mapping for logs
    const rawActions = (actionsData || []) as unknown as RawAction[];

    const logs: AdminRequestLog[] = rawActions.map((action) => ({
        id: action.id,
        action_type: action.action_type,
        comment: action.comment || undefined,
        created_at: action.created_at,
        actor: action.actor ? { full_name: action.actor.full_name } : null,
        from_step_id: action.from_step_id,
        to_step_id: action.to_step_id
    }));

    return (
        <AdminRequestDetails
            request={adminRequest}
            logs={logs}
            events={events}
            schema={runtimeSchema}
            activeSteps={activeSteps}
        />
    );
}
