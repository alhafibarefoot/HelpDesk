import InteractiveAIAssistant from "@/components/admin/interactive-ai-assistant";

import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Brain, Wand2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { WorkflowDefinition, FormSchema } from "@/types";

interface PageProps {
    searchParams: Promise<{
        serviceId?: string;
    }>
}

export default async function AIAssistantPage({ searchParams }: PageProps) {
    const params = await searchParams;
    let initialData = undefined;

    // Fetch existing service data if ID provided
    if (params.serviceId) {
        const supabase = createClient();

        // 1. Fetch Service
        const { data: service } = await supabase
            .from('services')
            .select('*')
            .eq('id', params.serviceId)
            .single();

        if (service) {
            // 2. Fetch Workflow
            const { data: workflow } = await supabase
                .from('workflows')
                .select('definition')
                .eq('service_id', service.id)
                .single();

            initialData = {
                serviceId: service.id,
                serviceName: service.name,
                serviceKey: service.key,
                workflow: (workflow?.definition as WorkflowDefinition) || { nodes: [], edges: [] },
                form: (service.form_schema as FormSchema) || { fields: [] }
            };
        }
    }

    return (
        <>

            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard/admin/services"
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-xl">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {initialData ? `تعديل خدمة: ${initialData.serviceName}` : 'منشئ الخدمات الذكي'}
                                    </h1>
                                    <p className="text-sm text-gray-600">
                                        {initialData ? 'استمر في تطوير الخدمة باستخدام الذكاء الاصطناعي' : 'إنشاء وتعديل الخدمات بالذكاء الاصطناعي'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Banner - Only show if NEW service */}
                {!initialData && (
                    <div className="bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#93C5FD] text-white py-8">
                        <div className="container mx-auto px-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <Brain className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">ذكاء متقدم</h3>
                                        <p className="text-sm text-purple-100">يفهم طلباتك بدقة</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">سريع وفعّال</h3>
                                        <p className="text-sm text-purple-100">إنشاء الخدمات في ثوانٍ</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                        <Wand2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">تعديل تفاعلي</h3>
                                        <p className="text-sm text-purple-100">حسّن المخطط بالمحادثة</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="pb-64">
                    <InteractiveAIAssistant initialData={initialData} />
                </div>
            </div>
        </>
    );
}
