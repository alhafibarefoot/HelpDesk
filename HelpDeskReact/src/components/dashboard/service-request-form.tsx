
"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FormSchema, FieldDefinition } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { submitRequest } from "@/app/actions";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ServiceRequestFormProps {
    serviceId: string;
    schema: FormSchema;
}

export function ServiceRequestForm({ serviceId, schema }: ServiceRequestFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    // Initialize form with default values or empty
    const { control, handleSubmit, register, watch, formState: { errors } } = useForm({
        defaultValues: {
            serviceId,
            priority: 'متوسط' // Default priority
        }
    });

    // Watch all form values for conditional logic
    const allValues = watch();

    const evaluateVisibility = (field: FieldDefinition) => {
        if (!field.rules || !Array.isArray(field.rules) || field.rules.length === 0) return true;

        // For now, support simple 'visibility' rule with 'eq' operator
        return field.rules.every(rule => {
            if (rule.type !== 'visibility') return true;
            const targetValue = (allValues as any)[rule.ifField];

            if (rule.operator === 'eq') {
                return targetValue === rule.value;
            }
            if (rule.operator === 'neq') {
                return targetValue !== rule.value;
            }
            return true;
        });
    };

    const onSubmit = async (data: any) => {
        setSubmitting(true);
        try {
            console.log("Submitting form data:", data);

            // 1. Handle File Uploads
            const processedData = { ...data };
            const { uploadFile } = await import("@/app/actions");

            for (const key in data) {
                if (data[key] instanceof File) {
                    const formData = new FormData();
                    formData.append('file', data[key]);
                    formData.append('requestId', 'temp'); // requestId is generated on server, but we need a path

                    const uploadResult = await uploadFile(formData);
                    processedData[key] = uploadResult.url;
                }
            }

            // 2. Submit Request
            const payload = { ...processedData, serviceId };
            const result = await submitRequest(payload);

            if (result.success) {
                toast({
                    title: "تم تقديم الطلب بنجاح",
                    description: result.message,
                    className: "bg-green-600 text-white"
                });
                // Redirect to the new request page
                router.push(`/dashboard/user/requests/${result.requestId}`);
            } else {
                toast({
                    variant: "destructive",
                    title: "فشل تقديم الطلب",
                    description: result.message || "حدث خطأ غير متوقع",
                });
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            toast({
                variant: "destructive",
                title: "خطأ",
                description: error.message || "فشل الاتصال بالخادم",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field: FieldDefinition) => {
        // Skip labels or sections if they are rendered structurally (sections are handled by iterator)
        if (field.type === 'section' || field.type === 'label') {
            return (
                <div key={field.id} className="py-2">
                    <h5 className="font-semibold text-gray-700">{field.label}</h5>
                    {field.description && <p className="text-sm text-gray-500">{field.description}</p>}
                </div>
            );
        }

        const isRequired = field.required;

        return (
            <div key={field.id} className={`space-y-2 ${(field.width === '1/2' ? 'col-span-1' : field.width === '1/3' ? 'col-span-1' : 'col-span-full')}`}>
                <Label htmlFor={field.key} className="flex gap-1">
                    {field.label}
                    {isRequired && <span className="text-red-500">*</span>}
                </Label>

                <Controller
                    name={field.key as any}
                    control={control}
                    rules={{ required: isRequired ? "هذا الحقل مطلوب" : false }}
                    render={({ field: { onChange, value } }) => {
                        // Handle different field types
                        switch (field.type) {
                            case 'text_multi':
                                return (
                                    <Textarea
                                        id={field.key}
                                        placeholder={field.placeholder}
                                        value={value || ''}
                                        onChange={onChange}
                                        className="bg-white min-h-[100px]"
                                    />
                                );
                            case 'choice_single':
                                return (
                                    <Select onValueChange={onChange} value={value}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder={field.placeholder || "اختر..."} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {field.config?.options?.map((opt: any) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                );
                            case 'attachment':
                                return (
                                    <div className="flex flex-col gap-2">
                                        <Input
                                            id={field.key}
                                            type="file"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    onChange(file);
                                                }
                                            }}
                                            className="bg-white"
                                            accept={field.config?.accept}
                                        />
                                        {value && value instanceof File && (
                                            <p className="text-xs text-blue-600 font-medium">
                                                تم اختيار: {value.name} ({(value.size / 1024).toFixed(1)} KB)
                                            </p>
                                        )}
                                    </div>
                                );
                            case 'text_single':
                            case 'number':
                            case 'decimal':
                            case 'email':
                            default:
                                return (
                                    <Input
                                        id={field.key}
                                        type={field.type === 'number' || field.type === 'decimal' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                                        placeholder={field.placeholder}
                                        value={value || ''}
                                        onChange={onChange}
                                        className="bg-white"
                                        step={field.type === 'decimal' ? '0.01' : '1'}
                                    />
                                );
                        }
                    }}
                />

                {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
                {(errors as any)[field.key] && (
                    <p className="text-xs text-red-500">{((errors as any)[field.key] as any)?.message}</p>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Schema Pages Iteration */}
            {schema.pages.map((page) => (
                <div key={page.id} className="space-y-6">
                    {/* Render Page Title if needed, usually redundant with header though */}
                    {schema.pages.length > 1 && <h3 className="text-xl font-bold text-gray-800 border-b pb-2">{page.title}</h3>}

                    {page.sections.map((section) => (
                        <div key={section.id} className="space-y-4">
                            {section.title && <h4 className="text-lg font-semibold text-blue-700">{section.title}</h4>}
                            <div className={`grid gap-4 ${section.columns === 2 ? 'md:grid-cols-2' : section.columns === 3 ? 'md:grid-cols-3' : 'grid-cols-1'}`}>
                                {section.fields.map((field) => {
                                    const fieldDef = field as FieldDefinition;
                                    if (!evaluateVisibility(fieldDef)) return null;
                                    return renderField(fieldDef);
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ))}

            {/* Standard Priority Field (if not in schema, or implicit) */}
            {/* We can make it optional or fixed. Adding it here for user control if desired, or hidden default. */}
            <div className="bg-gray-50 p-4 rounded-lg border">
                <Label>أولوية الطلب</Label>
                <div className="flex gap-4 mt-2">
                    <Controller
                        name="priority"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                            <RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <RadioGroupItem value="منخفض" id="p_low" />
                                    <Label htmlFor="p_low" className="font-normal cursor-pointer">منخفض</Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <RadioGroupItem value="متوسط" id="p_med" />
                                    <Label htmlFor="p_med" className="font-normal cursor-pointer">متوسط</Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <RadioGroupItem value="مرتفع" id="p_high" />
                                    <Label htmlFor="p_high" className="font-normal cursor-pointer">مرتفع</Label>
                                </div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                    <RadioGroupItem value="عاجل" id="p_urgent" className="text-red-500 border-red-500" />
                                    <Label htmlFor="p_urgent" className="font-normal cursor-pointer text-red-600">عاجل</Label>
                                </div>
                            </RadioGroup>
                        )}
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <Button type="submit" size="lg" disabled={submitting} className="min-w-[150px] gap-2">
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            جاري التقديم...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            تقديم الطلب
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
