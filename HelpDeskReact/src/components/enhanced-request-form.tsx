"use client"

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    Upload,
    X,
    FileText,
    Calendar,
    Clock,
    User,
    Send,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { FormSchema, FieldDefinition } from '@/types';

interface EnhancedRequestFormProps {
    schema: FormSchema;
    serviceId: string;
    serviceName: string;
    onSubmit: (data: any) => Promise<any>;
}

export function EnhancedRequestForm({ schema, serviceId, serviceName, onSubmit }: EnhancedRequestFormProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [files, setFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter useful fields (ignore sections for counting, but keep them for rendering order if needed logic changes)
    // For this implementation, we will treat sections as visual separators that don't split steps themselves,
    // but we'll stick to the count-based logic for now, ensuring we don't miss anything.
    const dataFields = useMemo(() => {
        // Flatten fields from pages and sections
        const allFields = schema.pages.flatMap(page => page.sections.flatMap(section => section.fields));
        return allFields.filter(f => f.type !== 'section');
    }, [schema]);

    // Configuration
    const FIELDS_PER_STEP = 100; // Increased to show all fields in fewer steps, or just one step for now as requested by user preference for completeness

    // Calculate total steps
    // Step 0...N: Data Entry
    // Step N+1: Review
    const dataStepCount = Math.ceil(dataFields.length / FIELDS_PER_STEP);
    const totalSteps = dataStepCount + 1;
    const isReviewStep = currentStep === totalSteps - 1;

    // Get fields for current step
    const currentFields = useMemo(() => {
        if (isReviewStep) return [];

        // Simple logic: Slice the non-section fields
        // Note: This logic might lose "Section" headers if they aren't part of dataFields.
        // To fix visuals: We need to map back to original schema.
        // BETTER APPROACH: Just show ALL fields in step 0 if we set FIELDS_PER_STEP high enough.

        // Flatten fields from pages and sections to iterate linearly
        const allFields = schema.pages.flatMap(page => page.sections.flatMap(section => section.fields));
        let visibleFields: FieldDefinition[] = [];
        let dataCounter = 0;
        let startDataIndex = currentStep * FIELDS_PER_STEP;
        let endDataIndex = startDataIndex + FIELDS_PER_STEP;

        for (const field of allFields) {
            if (field.type === 'section') {
                // Simplified: Just include sections if we are adding fields. 
                visibleFields.push(field as FieldDefinition);
            } else {
                if (dataCounter >= startDataIndex && dataCounter < endDataIndex) {
                    visibleFields.push(field as FieldDefinition);
                }
                dataCounter++;
            }
        }

        return visibleFields;
    }, [schema, currentStep, isReviewStep]);

    const handleInputChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        // Clear error when user types
        if (errors[key]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const validateCurrentStep = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        currentFields.forEach(field => {
            if (field.type === 'section') return;

            if (field.required) {
                const value = formData[field.key];
                // Check for empty string, null, undefined, or empty array
                if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                    newErrors[field.key] = 'هذا الحقل مطلوب';
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);

        if (!isValid) {
            // Scroll to the first error
            const firstErrorKey = Object.keys(newErrors)[0];
            const element = document.getElementById(firstErrorKey);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        }

        return isValid;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
            window.scrollTo(0, 0);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setErrors({});
        setSuccessMessage(null);

        try {
            // Note: We are excluding 'files' for now as the backend action expects a JSON object
            // and does not yet handle file uploads to Supabase Storage.
            // Sending raw File objects can cause serialization issues or large payload errors.
            const { files: _, ...dataToSubmit } = { ...formData };
            const result = await onSubmit(dataToSubmit);

            if (result && result.success) {
                setSuccessMessage(result.message || "تم تقديم الطلب بنجاح! جاري تحويلك...");
                setTimeout(() => {
                    router.push('/dashboard/requests');
                    router.refresh();
                }, 2000);
            } else {
                setErrors({ submit: result?.message || 'حدث خطأ أثناء التقديم' });
            }
        } catch (error) {
            console.error('Submission error:', error);
            setErrors({ submit: 'حدث خطأ غير متوقع' });
        } finally {
            if (!successMessage) {
                setIsSubmitting(false);
            }
        }
    };

    const renderField = (field: FieldDefinition) => {
        const value = formData[field.key] || '';
        const error = errors[field.key];
        // Calculate width: default to full if not specified.
        // We can map '1/2' to 'md:w-1/2' etc.
        const widthClass = field.width === '1/2' ? 'w-full md:w-1/2' : field.width === '1/3' ? 'w-full md:w-1/3' : 'w-full';

        // SECTION HEADER
        if (field.type === 'section') {
            return (
                <div key={`section-${field.key}`} className="w-full mt-8 mb-4 pb-2 border-b border-gray-200">
                    <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                        {field.label}
                    </h4>
                </div>
            );
        }

        // INPUT WRAPPER
        return (
            <div key={field.key} className={`${widthClass} px-3 mb-5`}>
                <div className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500 text-base">*</span>}
                    </Label>

                    {/* TEXT / EMAIL / NUMBER */}
                    {(field.type === 'text_single' || field.type === 'email' || field.type === 'number') && (
                        <Input
                            id={field.key}
                            type={field.type === 'text_single' ? 'text' : field.type}
                            value={value}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className={`h-11 ${error ? 'border-red-500 focus-visible:ring-red-200' : ''}`}
                            placeholder={field.placeholder || `أدخل ${field.label}`}
                        />
                    )}

                    {/* TEXTAREA */}
                    {field.type === 'text_multi' && (
                        <Textarea
                            id={field.key}
                            value={value}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className={`min-h-[120px] resize-y ${error ? 'border-red-500 focus-visible:ring-red-200' : ''}`}
                            placeholder={field.placeholder || `أدخل ${field.label}`}
                        />
                    )}

                    {/* DATE */}
                    {field.type === 'date' && (
                        <div className="relative">
                            <Input
                                id={field.key}
                                type="date"
                                value={value}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className={`h-11 ${error ? 'border-red-500 focus-visible:ring-red-200' : ''}`}
                            />
                            {/* Icon overlay could go here via CSS or Lucide if needed, typically browser native picker is fine */}
                        </div>
                    )}

                    {/* TIME */}
                    {field.type === 'time' && (
                        <div className="relative">
                            <Input
                                id={field.key}
                                type="time"
                                value={value}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className={`h-11 ${error ? 'border-red-500 focus-visible:ring-red-200' : ''}`}
                            />
                        </div>
                    )}

                    {/* DATETIME-LOCAL */}
                    {field.type === 'datetime' && (
                        <Input
                            id={field.key}
                            type="datetime-local"
                            value={value}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className={`h-11 ${error ? 'border-red-500 focus-visible:ring-red-200' : ''}`}
                        />
                    )}

                    {/* SELECT */}
                    {field.type === 'choice_single' && (
                        <div className="relative">
                            <select
                                id={field.key}
                                value={value}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                className={`w-full h-11 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500 focus:ring-red-200' : 'border-input focus:ring-blue-500'
                                    }`}
                            >
                                <option value="">اختر {field.label}</option>
                                {field.config?.options?.map((option: any, index: number) => {
                                    const optionValue = typeof option === 'string' ? option : option.value || option.label || String(option);
                                    const optionLabel = typeof option === 'string' ? option : option.label || option.value || String(option);
                                    return (
                                        <option key={`${field.key}-opt-${index}-${optionValue}`} value={optionValue}>
                                            {optionLabel}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* CHECKBOX (Single & Multi) */}
                    {field.type === 'checkbox' && (
                        <div className={`space-y-3 p-3 bg-gray-50 rounded-lg border ${error ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                            {field.config?.options && field.config.options.length > 0 ? (
                                // Multi-option checkbox
                                field.config.options.map((option: any, index: number) => {
                                    const optionValue = typeof option === 'string' ? option : option.value || option.label || String(option);
                                    const optionLabel = typeof option === 'string' ? option : option.label || option.value || String(option);
                                    const isChecked = Array.isArray(value) ? value.includes(optionValue) : false;

                                    return (
                                        <label
                                            key={`${field.key}-chk-${index}`}
                                            className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                                        >
                                            <div className="relative flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const currentValues = Array.isArray(value) ? value : [];
                                                        const newValues = e.target.checked
                                                            ? [...currentValues, optionValue]
                                                            : currentValues.filter(v => v !== optionValue);
                                                        handleInputChange(field.key, newValues);
                                                    }}
                                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-all"
                                                />
                                            </div>
                                            <span className="text-sm text-gray-700 font-medium">{optionLabel}</span>
                                        </label>
                                    );
                                })
                            ) : (
                                // Single boolean checkbox
                                <label className="flex items-center gap-3 cursor-pointer p-1">
                                    <input
                                        type="checkbox"
                                        checked={!!value}
                                        onChange={(e) => handleInputChange(field.key, e.target.checked)}
                                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-all"
                                    />
                                    <span className="text-sm text-gray-700">{field.label}</span>
                                </label>
                            )}
                        </div>
                    )}

                    {/* ERROR MESSAGE */}
                    {error && (
                        <div className="flex items-center gap-1 mt-1 text-red-500 animate-in slide-in-from-top-1 fade-in duration-200">
                            <AlertCircle className="w-4 h-4" />
                            <p className="text-xs font-medium">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (successMessage) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-3">تم تقديم الطلب بنجاح!</h3>
                <p className="text-lg text-gray-600 mb-8 max-w-md">{successMessage}</p>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    جاري تحويلك لصفحة طلباتي...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Progress Header */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{isReviewStep ? 'مراجعة الطلب' : serviceName}</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {isReviewStep ? 'يرجى مراجعة البيانات قبل الإرسال النهائي' : `الخطوة ${currentStep + 1} من ${totalSteps}`}
                        </p>
                    </div>
                    <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {Math.round(((currentStep + 1) / totalSteps) * 100)}%
                    </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main Form Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/50 p-6 sm:p-8 min-h-[400px]">
                {errors.submit && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3 animate-in shake">
                        <X className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">{errors.submit}</p>
                    </div>
                )}

                {!isReviewStep ? (
                    <div className="space-y-6">
                        <div className="flex flex-wrap -mx-3">
                            {currentFields.map(renderField)}
                        </div>

                        {/* File Upload - Only on the last data step (which is likely the only step now) */}
                        {currentStep === dataStepCount - 1 && (
                            <div className="mt-8 pt-8 border-t border-gray-100 w-full animate-in fade-in duration-700 delay-150">
                                <Label className="text-base font-semibold text-gray-800 mb-3 block">
                                    المرفقات (اختياري)
                                </Label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 group cursor-pointer relative">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        id="file-upload"
                                    />
                                    <div className="pointer-events-none">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <Upload className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <p className="text-base font-medium text-gray-700">
                                            اضغط لرفع الملفات أو اسحبها هنا
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            PDF, DOC, DOCX, JPG, PNG (حتى 10MB)
                                        </p>
                                    </div>
                                </div>

                                {files.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 mt-4">
                                        {files.map((file, index) => (
                                            <div
                                                key={`file-${index}`}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 text-blue-600">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {(file.size / 1024).toFixed(2)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFile(index)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    // REVIEW STEP
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">نوع الخدمة</p>
                                    <p className="text-lg font-bold text-gray-900">{serviceName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">ملخص البيانات</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {dataFields.map(field => {
                                    const rawValue = formData[field.key];
                                    let displayValue = rawValue;

                                    if (field.type === 'section') return null;

                                    if (Array.isArray(rawValue)) {
                                        displayValue = rawValue.join(', ');
                                    } else if (typeof rawValue === 'boolean') {
                                        displayValue = rawValue ? 'نعم' : 'لا';
                                    } else if (!rawValue) {
                                        displayValue = '-';
                                    }

                                    return (
                                        <div key={field.key} className="bg-gray-50/50 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">{field.label}</p>
                                            <p className="font-semibold text-gray-900 break-words">{displayValue}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            {files.length > 0 && (
                                <div className="mt-6 pt-6 border-t">
                                    <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Upload className="w-4 h-4" />
                                        المرفقات ({files.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                                                <FileText className="w-3.5 h-3.5" />
                                                {f.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                <Button
                    onClick={handlePrevious}
                    disabled={currentStep === 0 || isSubmitting}
                    variant="outline"
                    className="gap-2 h-11 px-6 text-base font-medium border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                >
                    <ArrowRight className="w-4 h-4" /> السابق
                </Button>

                {!isReviewStep ? (
                    <Button
                        onClick={handleNext}
                        className="gap-2 h-11 px-8 text-base font-medium bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                    >
                        التالي <ArrowLeft className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="gap-2 h-11 px-8 text-base font-medium bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 min-w-[160px]"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </Button>
                )}
            </div>
        </div>
    );
}
