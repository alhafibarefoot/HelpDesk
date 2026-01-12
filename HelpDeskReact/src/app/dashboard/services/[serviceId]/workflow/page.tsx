
import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { WorkflowDesigner } from "@/components/workflow/designer/workflow-designer";

interface PageProps {
    params: Promise<{
        serviceId: string;
    }>;
}

export const dynamic = 'force-dynamic';

export default async function WorkflowDesignerPage({ params }: PageProps) {
    const { serviceId } = await params;
    const supabase = await createClient();

    // 1. Auth & Role Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'service_owner')) {
        return (
            <div className="p-8 text-center text-red-600">
                عذراً، هذه الصفحة مخصصة للمسؤولين وملاك الخدمات فقط.
            </div>
        );
    }

    // 2. Fetch Service
    const { data: service } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

    if (!service) notFound();

    // 3. Fetch Existing Workflow (if any)
    const { data: workflow } = await supabase
        .from('workflows')
        .select('definition')
        .eq('service_id', serviceId)
        .single();

    const initialDefinition = workflow?.definition || null;

    return (
        <div className="h-[calc(100vh-65px)] bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">مصمم سير العمل</h1>
                    <p className="text-sm text-gray-500">الخدمة: {service.name}</p>
                </div>
                {/* Actions will be inside the Client Component to control state */}
            </header>

            <div className="flex-1 overflow-hidden relative">
                <WorkflowDesigner
                    serviceId={service.id}
                    serviceKey={service.key}
                    initialDefinition={initialDefinition}
                />
            </div>
        </div>
    );
}
