import { SmartFormBuilder } from "@/components/admin/smart-form-builder";
import { requireAdminPage } from "@/lib/auth-helpers";
import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { FormSchema } from "@/types";
import { updateServiceFormSchema } from "@/app/actions";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{
        serviceKey: string;
    }>;
}

export default async function ServiceFormBuilderPage({ params }: PageProps) {
    const { serviceKey } = await params;

    // Debug Param
    const decodedKey = decodeURIComponent(serviceKey);
    console.log(`[ServiceFormBuilderPage] Raw param: "${serviceKey}", Decoded: "${decodedKey}"`);

    // Secure Auth Check
    const { isAdmin } = await requireAdminPage();
    if (!isAdmin) {
        redirect('/dashboard');
    }

    // Fetch service
    const supabase = await createClient();
    const { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('key', decodedKey)
        .single();

    if (error || !service) {
        notFound();
    }

    const handleSave = async (schema: FormSchema) => {
        "use server";
        await updateServiceFormSchema(serviceKey, schema);
        redirect(`/dashboard/admin`);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/dashboard/admin"
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">مصمم النماذج الذكي</h1>
                                <p className="text-sm text-gray-600">{service.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Builder Content */}
            <div className="container mx-auto px-6 py-8">
                <SmartFormBuilder
                    initialSchema={service.form_schema as FormSchema}
                    onSave={handleSave}
                    serviceId={service.id}
                />
            </div>
        </div>
    );
}
