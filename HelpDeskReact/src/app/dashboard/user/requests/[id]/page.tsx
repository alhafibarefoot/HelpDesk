import { createClient, createAdminClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import RequestDetailsClient from "./RequestDetailsClient";
import { getStepFieldPermissions } from "@/app/actions/permissions";
import { applyStepPermissions } from "@/lib/form/runtime-adapter";
import { FormSchema, StepFieldPermission } from "@/types";

export const revalidate = 0;


export default async function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // 2. Fetch Request Data
    const { data: request, error } = await supabase
        .from('requests')
        .select(`
            *,
            service:service_id ( name, key ),
            request_form_values ( form_data )
        `)
        .eq('id', id)
        .single();

    // Map request_form_values to request.form_data if needed
    if (request && (!request.form_data || Object.keys(request.form_data).length === 0)) {
        if (request.request_form_values && request.request_form_values.length > 0) {
            request.form_data = request.request_form_values[0].form_data;
        }
    }

    if (error || !request) {
        return (
            <div className="p-8 text-center text-red-600 font-bold">
                <div className="p-8 text-center text-red-600 font-bold flex flex-col gap-2">
                    <span>عذراً، الطلب غير موجود أو تم حذفه.</span>
                    {error && (
                        <span className="text-sm font-mono bg-red-50 p-2 rounded text-left dir-ltr">
                            Error: {error.message} (Code: {error.code})
                        </span>
                    )}
                    {!request && !error && <span className="text-sm text-gray-500">Request object is null.</span>}
                    <span className="text-xs text-gray-400">ID: {id}</span>
                </div>
            </div>
        );
    }

    // 3. Authorization Logic
    const { data: userProfile } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    const isRequester = request.requester_id === user.id;

    // Check if user has any pending tasks assigned to them explicitly OR via Role
    // USE ADMIN CLIENT to bypass RLS for this specific check to guarantee correctness
    const { count: pendingTaskCount } = await adminSupabase
        .from('workflow_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('request_id', request.id)
        .eq('status', 'pending')
        .or(`assigned_to_user.eq.${user.id},assigned_to_role.eq.${userProfile?.role}`);

    const hasPendingTask = (pendingTaskCount || 0) > 0;
    const isAssignee = (userProfile?.role === request.assigned_role) || hasPendingTask;
    const isAdmin = userProfile?.role === 'admin';

    if (!isRequester && !isAssignee && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border border-gray-200 m-8" dir="rtl">
                <h2 className="text-xl font-bold text-red-600 mb-2">ليس لديك صلاحية لعرض هذا الطلب</h2>
                <p className="text-gray-500">
                    يمكنك فقط عرض الطلبات التي قدمتها أو التي تم تعيينها لدورك الوظيفي.
                </p>
            </div>
        );
    }

    // 4. Fetch Timeline Events
    const { data: rawEvents, error: eventsError } = await supabase
        .from('request_events')
        .select('*')
        .eq('request_id', request.id)
        .order('created_at', { ascending: true });

    if (eventsError) console.error("Events fetch error:", JSON.stringify(eventsError, null, 2));

    // Manual Join for Actor Details (to avoid missing FK issues)
    let events = [];
    if (rawEvents && rawEvents.length > 0) {
        // Fix: Use 'performed_by' instead of 'actor_id' based on schema
        const actorIds = Array.from(new Set(rawEvents.map(e => e.performed_by).filter(Boolean)));

        let actorsMap: Record<string, any> = {};
        if (actorIds.length > 0) {
            const { data: actors } = await supabase
                .from('users')
                .select('id, full_name, role')
                .in('id', actorIds);

            actors?.forEach(a => { actorsMap[a.id] = a; });
        }

        events = rawEvents.map(e => ({
            ...e,
            actor: actorsMap[e.performed_by] || { full_name: 'مستخدم محذوف', role: 'unknown' }
        }));
    }

    console.log(`[RequestDetails] ID: ${id}, Events Found: ${events.length}`);

    // 5. Fetch Workflow Definition & Schema Logic
    let workflowNodes: any[] = [];
    let runtimeSchema: FormSchema | null = null;
    let safeServiceKey = request.service?.key;

    // Resolve Service Key if it's an array/object structure quirk
    if (!safeServiceKey && Array.isArray(request.service)) safeServiceKey = request.service[0]?.key;

    if (safeServiceKey) {
        const { getWorkflowDefinition } = await import("@/lib/workflow-engine");
        const def = await getWorkflowDefinition(safeServiceKey);
        if (def && def.nodes) {
            workflowNodes = def.nodes;
        }

        // --- Permission Enforcement Logic ---

        // A. Resolve Schema
        let baseSchema: FormSchema | null = null;
        if (request.form_schema_snapshot) {
            baseSchema = request.form_schema_snapshot as FormSchema;
        } else {
            const { data: serviceData } = await supabase
                .from('services')
                .select('form_schema')
                .eq('key', safeServiceKey)
                .single();
            if (serviceData?.form_schema) baseSchema = serviceData.form_schema as FormSchema;
        }

        if (baseSchema) {
            // B. Resolve Role Type
            // Check if user is an active assignee for ANY active step
            const { data: activeSteps } = await supabase
                .from('request_active_steps')
                .select('step_id')
                .eq('request_id', request.id)
                .eq('status', 'active'); // Assuming RLS or logic filters mainly by user in future list, but here we just check existing steps

            // Refined Role Logic:
            // 1. Are we the Requester?
            let computedRoleType: 'requester' | 'assignee' | 'others' = 'others';

            if (request.requester_id === user.id) {
                computedRoleType = 'requester';
            }

            // 2. Are we an Assignee? (Overrides requester if self-approval? Usually Assignee is stronger context for work)
            // But wait, if I am the requester AND the assignee, I probably want to see "Assignee" fields (edit rights).
            const isCurrentAssignee = userProfile?.role === request.assigned_role; // Legacy check
            // Better: Check if we are potentially an actor on the current step
            // For now, relying on the page's auth check `isAssignee` variable is a good proxy.
            if (isAssignee) {
                computedRoleType = 'assignee';
            }

            // C. Fetch Permissions for *active* steps (or current_step_id)
            // If parallel, we might have multiple steps. 
            // For simplicity in this "Detail View", we enforce permissions of the 'primary' current step (request.current_step_id)
            // If null/parallel, we might skip enforcement or default to 'Others'.
            if (request.current_step_id) {
                try {
                    const allPermissions = await getStepFieldPermissions(request.current_step_id);
                    // Filter for our role
                    const rolePermissions = allPermissions.filter(p => p.role_type === computedRoleType);

                    // Apply
                    runtimeSchema = applyStepPermissions(baseSchema, rolePermissions, []);
                } catch (e) {
                    console.error("Permission apply failed", e);
                    runtimeSchema = baseSchema;
                }
            } else {
                runtimeSchema = baseSchema;
            }
        }
    }

    // 6. Render Client Component
    return (
        <RequestDetailsClient
            request={request}
            currentUser={{
                id: user.id,
                full_name: userProfile?.full_name || 'مستخدم',
                role: userProfile?.role
            }}
            initialEvents={events || []}
            workflowNodes={workflowNodes}
            schema={runtimeSchema}
        />
    );
}
