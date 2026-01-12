import { EnhancedWorkflowEditor } from "@/components/admin/enhanced-workflow-editor";
import { getWorkflowDefinition } from "@/lib/workflow-engine";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PageProps {
    params: Promise<{
        serviceId: string;
    }>;
}

export default async function WorkflowEditorPage({ params }: PageProps) {
    const { serviceId } = await params;
    const serviceKey = serviceId;

    // Fetch service details
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: service } = await supabase
        .from('services')
        .select('name, form_schema')
        .eq('key', serviceKey)
        .single();

    const serviceName = service?.name || serviceKey;
    const workflow = await getWorkflowDefinition(serviceKey);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Breadcrumb Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/admin"
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{serviceName}</h1>
                        <p className="text-sm text-gray-500">تصميم وإدارة سير العمل</p>
                    </div>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden">
                <EnhancedWorkflowEditor
                    serviceKey={serviceKey}
                    initialNodes={workflow?.nodes}
                    initialEdges={workflow?.edges}
                    formSchema={service?.form_schema}
                />
            </div>
        </div>
    );
}

