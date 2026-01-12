'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Loader2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SmartFormRenderer } from "@/components/form/smart-form-renderer";
import { submitRequest, getCloneData } from "@/app/actions";
import { FormSchema, FormPage, FormSection } from "@/types";
// import { createClient } from "@/lib/supabase"; // Not used anymore

interface Service {
    id: string;
    name: string;
    key: string;
    description?: string;
    category?: string;
    form_schema?: FormSchema;
}

interface User {
    id: string;
    email?: string;
}

interface Props {
    services: Service[];
    currentUser: User;
    initialCloneId?: string;
}

// Standard Fields Schema Part
const STANDARD_FIELDS_SECTION: FormSection = {
    id: "std_section",
    title: "بيانات الطلب الأساسية",
    columns: 1,
    fields: [
        {
            id: "std_title",
            key: "title",
            type: "text_single",
            label: "عنوان الطلب",
            required: true,
            placeholder: "مثال: طلب صيانة جهاز حاسب",
            width: "full"
        },
        {
            id: "std_description",
            key: "description",
            type: "text_multi",
            label: "وصف الطلب",
            required: true,
            placeholder: "يرجى وصف طلبك بالتفصيل...",
            config: { rows: 4 },
            width: "full"
        },
        {
            id: "std_priority",
            key: "priority",
            type: "choice_single", // We need to ensure Renderer handles this or stick to simplified 'select'
            label: "الأولوية",
            required: true,
            defaultValue: "متوسط",
            width: "1/2", // Will fallback to full if renderer logic handled simply
            config: {
                options: [
                    { label: "منخفض", value: "منخفض" },
                    { label: "متوسط", value: "متوسط" },
                    { label: "مرتفع", value: "مرتفع" },
                    { label: "عاجل", value: "عاجل" }
                ]
            }
        }
    ]
};

// Standard Fields are mapped to the renderer.
// Note: We use 'choice_single' for priority which maps to 'select' in the renderer.

export default function NewRequestWizard({ services, currentUser, initialCloneId }: Props) {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingClone, setIsLoadingClone] = useState(false);

    const [defaultValues, setDefaultValues] = useState<any>({ priority: "متوسط" });

    // Fetch Clone Data (Server Action)
    useEffect(() => {
        if (!initialCloneId) return;

        const loadCloneData = async () => {
            console.log("Loading clone data via Server Action for ID:", initialCloneId);
            setIsLoadingClone(true);
            try {
                const result = await getCloneData(initialCloneId);

                if (result.success && result.data) {
                    console.log("Clone data loaded:", result.data);
                    setSelectedServiceId(result.data.service_id);

                    // Sanitize Priority if it's not a simple string
                    let priority = result.data.form_data.priority;
                    if (typeof priority === 'object' || (typeof priority === 'string' && priority.startsWith('{'))) {
                        priority = "متوسط"; // Fallback for legacy JSON values
                    }

                    setDefaultValues({
                        ...result.data.form_data,
                        priority: priority || "متوسط" // Explicitly overwrite
                    });
                    setStep(2); // Jump to form
                } else {
                    console.error("Clone failed:", result.message);
                    setError(result.message || "فشل تحميل بيانات الطلب");
                }
            } catch (err: any) {
                console.error("Catch Error:", err);
                setError("فشل تحميل بيانات الطلب للنسخ");
            } finally {
                setIsLoadingClone(false);
            }
        };

        loadCloneData();
    }, [initialCloneId]);

    // Helpers
    const selectedService = services.find(s => s.id === selectedServiceId);

    // Construct merged schema on the fly
    const activeSchema = useMemo((): FormSchema => {
        if (!selectedService) return { pages: [] } as any;

        const serviceSchema = (selectedService.form_schema as FormSchema) || { pages: [] };

        // Check if serviceSchema is V2 (has pages)
        let pages: FormPage[] = [];

        if (serviceSchema.pages) {
            // It is V2
            // Clone pages to avoid mutation issues
            pages = [...serviceSchema.pages];
        } else if ((serviceSchema as any).fields) {
            // It is V1 (Legacy) - Convert to V2 Page 2
            pages = [{
                id: "legacy_page",
                title: "تفاصيل الخدمة",
                sections: [{
                    id: "legacy_section",
                    columns: 1,
                    fields: (serviceSchema as any).fields.map((f: any) => {
                        let type: any = 'text_single';
                        if (f.type === 'textarea') type = 'text_multi';
                        else if (f.type === 'number') type = 'number';
                        else if (f.type === 'date') type = 'date';
                        else if (f.options && f.options.length > 0) type = 'choice_single';

                        // Map simple string options to {label, value}
                        const config = f.options ? {
                            options: f.options.map((opt: string) => ({ label: opt, value: opt }))
                        } : undefined;

                        return {
                            id: f.key,
                            key: f.key,
                            type,
                            label: f.label,
                            required: f.required,
                            placeholder: f.placeholder,
                            width: 'full',
                            config
                        };
                    })
                }]
            }];
        }

        // Prepend Standard Page? Or Prepend Standard Section to first Page?
        // Let's prepend a "General Info" page if the service has its own pages.
        // Or if the service has very few fields, maybe merge?
        // Safe bet: Prepend a Page.

        const standardPage: FormPage = {
            id: "std_page",
            title: "بيانات الطلب",
            sections: [STANDARD_FIELDS_SECTION]
        };

        return {
            version: "2.0",
            pages: [standardPage, ...pages]
        };

    }, [selectedService]);

    const handleServiceSelect = (id: string) => {
        setSelectedServiceId(id);
        setError(null);
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
        setSelectedServiceId(null);
    };

    const handleSubmit = async (data: any) => {
        if (!selectedServiceId) return;
        setIsSubmitting(true);
        setError(null);

        try {
            // Prepare payload
            // data contains flat keys: title, description, priority, ...dynamicKeys
            const payload = {
                serviceId: selectedServiceId,
                ...data
            };

            const result = await submitRequest(payload);

            if (result.success) {
                // Success: Redirect
                router.push(`/dashboard/user/requests/${result.requestId}`);
                // NOTE: We do NOT set isSubmitting(false) here.
                // We want the button to remain disabled until navigation completes.
            } else {
                setError(result.message || "فشل تقديم الطلب");
                setIsSubmitting(false); // Only re-enable on error
            }
        } catch (e: any) {
            setError(e.message || "حدث خطأ غير متوقع");
            setIsSubmitting(false); // Only re-enable on error
        }
    };

    // Filter Logic
    const q = searchQuery.trim().toLowerCase();
    const filteredServices = services.filter(s => {
        const name = s.name.toLowerCase();
        const desc = s.description?.toLowerCase() || "";
        return q === "" || name.includes(q) || desc.includes(q);
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6" dir="rtl">

            {/* Header */}
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                {step === 1 ? "إنشاء طلب جديد" : `تقديم طلب: ${selectedService?.name}`}
            </h1>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* STEP 1: SELECT SERVICE */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="relative">
                        <Search className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="ابحث عن خدمة..."
                            className="pr-12 h-12 text-base shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredServices.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">لا توجد خدمات مطابقة</div>
                        )}
                        {filteredServices.map((service) => (
                            <div
                                key={service.id}
                                onClick={() => handleServiceSelect(service.id)}
                                className="p-5 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg border-gray-100 bg-white hover:border-blue-400 h-full flex flex-col items-start gap-2 group"
                            >
                                <div className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">{service.name}</div>
                                <div className="text-sm text-gray-500 line-clamp-3 mb-auto leading-relaxed">{service.description}</div>
                                {service.category && (
                                    <Badge variant="secondary" className="mt-3 text-xs bg-gray-100 text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600">{service.category}</Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: SMART FORM */}
            {step === 2 && selectedService && (
                <div className="animate-in slide-in-from-right-8 duration-300">
                    <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                        <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSubmitting}>
                            <ChevronRight className="w-4 h-4 ml-1" />
                            تغيير الخدمة
                        </Button>
                    </div>

                    <SmartFormRenderer
                        schema={activeSchema}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        defaultValues={defaultValues}
                    />
                </div>
            )}

        </div>
    );
}
