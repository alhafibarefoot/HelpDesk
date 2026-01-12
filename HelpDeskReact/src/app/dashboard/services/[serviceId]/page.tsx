
import { createClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { ServiceRequestForm } from "@/components/dashboard/service-request-form";
import { Card } from "@/components/ui/card";
import { ArrowRight, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: Promise<{
        serviceId: string;
    }>;
}

export default async function ServiceRequestPage({ params }: PageProps) {
    const supabase = await createClient();
    const { serviceId } = await params; // Await params for Next.js 15+

    // 1. Authenticate
    const { data: { user } } = await supabase.auth.getUser();
    console.log(`[ServiceRequestPage] Visiting /${serviceId}, User: ${user?.id}`);

    if (!user) {
        console.log(`[ServiceRequestPage] No user, redirecting to login`);
        redirect('/login');
    }

    // 2. Fetch Service by Key (or ID as fallback)
    console.log(`[ServiceRequestPage] Fetching service with key: ${serviceId}`);
    let { data: service, error } = await supabase
        .from('services')
        .select('*')
        .eq('key', serviceId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error(`[ServiceRequestPage] DB Error:`, error);
    }
    if (!service) console.log(`[ServiceRequestPage] Service not found by Key, trying ID...`);


    if (!service) {
        // Fallback: try ID just in case
        const { data: serviceById } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();
        service = serviceById;
    }

    if (!service) {
        notFound();
    }

    if (service.status !== 'active' && service.status !== 'maintenance') {
        // Optionally handle suspended/archived differently
        return (
            <div className="container mx-auto py-12 px-4 text-center">
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow border">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-gray-900 mb-2">الخدمة غير متاحة</h1>
                    <p className="text-gray-500 mb-6">عذراً، هذه الخدمة غير متاحة للتقديم حالياً.</p>
                    <Link href="/dashboard/services">
                        <Button variant="outline">عودة لدليل الخدمات</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // 3. Render Form
    return (
        <div className="container mx-auto py-8 px-4" dir="rtl">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                    <Link href="/dashboard/services" className="hover:text-blue-600 flex items-center gap-1">
                        <ArrowRight className="w-4 h-4" />
                        دليل الخدمات
                    </Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{service.name}</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">{service.name}</h1>
                <p className="text-gray-600 max-w-3xl">{service.description}</p>
                {service.status === 'maintenance' && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md mt-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <p>تنبيه: هذه الخدمة قيد الصيانة حالياً، قد تواجه بعض التأخير.</p>
                    </div>
                )}
            </div>

            {/* Form Container */}
            <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                    <ServiceRequestForm
                        serviceId={service.id}
                        schema={service.form_schema || { pages: [] }} // Pass simple default if null
                    />
                </Card>
            </div>
        </div>
    );
}
