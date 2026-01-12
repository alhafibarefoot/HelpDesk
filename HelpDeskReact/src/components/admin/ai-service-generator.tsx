"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { ServiceGenerationResult } from '@/lib/ai-service-builder';
import { ImageUploadButton } from "@/components/ui/image-upload-button";
import dynamic from 'next/dynamic';

// Lazy load the preview component to avoid SSR issues with ReactFlow
const WorkflowPreview = dynamic(() => import('./workflow-preview'), {
    ssr: false,
    loading: () => <div className="h-[400px] flex items-center justify-center">جاري التحميل...</div>
});

const examplePrompts = [
    "طلب إجازة: موافقة المدير المباشر، ثم HR إذا كانت الإجازة أكثر من 5 أيام",
    "طلب دعم فني: تعيين للفني، ثم موافقة المشرف إذا كان التكلفة أكثر من 500 ريال",
    "طلب شراء: موافقة مدير القسم، ثم المدير المالي إذا المبلغ أكثر من 1000",
];

interface AIServiceGeneratorProps {
    onServiceGenerated?: (result: ServiceGenerationResult) => void;
}

export function AIServiceGenerator({ onServiceGenerated }: AIServiceGeneratorProps) {
    const [description, setDescription] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<ServiceGenerationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!description.trim() && !selectedImage) {
            setError("الرجاء كتابة وصف للخدمة أو إرفاق صورة");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/generate-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description,
                    image: selectedImage // Pass base64 image
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'فشل في إنشاء الخدمة');
            }

            const data: ServiceGenerationResult = await response.json();
            setResult(data);
            onServiceGenerated?.(data);
            // Optionally clear inputs upon success
            // setDescription('');
            // setSelectedImage(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold">مساعد إنشاء الخدمات الذكي</h2>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                    صف الخدمة التي تريد إنشاءها، والمساعد الذكي سيبني المخطط والنموذج تلقائياً
                </p>

                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثال: طلب إجازة يحتاج موافقة المدير، ثم HR إذا كانت أكثر من 5 أيام... (أو أرفق صورة للنموذج)"
                    className="w-full h-32 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    disabled={isGenerating}
                />

                <div className="mt-2 text-right">
                    <span className="text-xs text-gray-500 ml-2">يمكنك إرفاق صورة لنموذج ورقي أو مخطط:</span>
                    <ImageUploadButton
                        onImageSelected={setSelectedImage}
                        disabled={isGenerating}
                    />
                </div>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">
                        {description.length} حرف
                    </span>
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || (!description.trim() && !selectedImage)}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                جاري الإنشاء...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                إنشاء الخدمة
                            </>
                        )}
                    </Button>
                </div>

                {/* Example Prompts */}
                <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">أمثلة للتجربة:</p>
                    <div className="flex flex-wrap gap-2">
                        {examplePrompts.map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => setDescription(prompt)}
                                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                disabled={isGenerating}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-red-900">خطأ</p>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Result Display */}
            {result && (
                <div className="space-y-4">
                    {/* Success Message */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="font-medium text-green-900">تم إنشاء الخدمة بنجاح!</p>
                            <p className="text-sm text-green-700">
                                الخدمة: {result.serviceName} ({result.serviceKey})
                            </p>
                        </div>
                    </div>

                    {/* Workflow Preview */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">معاينة المخطط</h3>
                        <WorkflowPreview workflow={result.workflow} />
                    </div>

                    {/* Form Preview */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">حقول النموذج</h3>
                        <div className="space-y-3">
                            {result.form.pages.flatMap(page =>
                                page.sections.flatMap(section =>
                                    section.fields.map((field, idx) => (
                                        <div key={`${page.id}-${section.id}-${field.key || field.id || idx}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{field.label}</p>
                                                <p className="text-xs text-gray-500">
                                                    النوع: {field.type} {field.required && '(مطلوب)'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
