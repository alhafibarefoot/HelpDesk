'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ImageUploadButton } from '@/components/ui/image-upload-button';
import { Sparkles, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Service } from '@/types';

interface UserAIAssistantProps {
    services: Service[];
    onRequestCreated?: (requestId: string) => void;
}

interface ParsedRequest {
    serviceKey: string;
    serviceName: string;
    formData: Record<string, any>;
    confidence: number;
}

export function UserAIAssistant({ services, onRequestCreated }: UserAIAssistantProps) {
    const [userInput, setUserInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{
        type: 'success' | 'error' | 'preview';
        message: string;
        parsedRequest?: ParsedRequest;
    } | null>(null);

    const handleSubmit = async () => {
        if (!userInput.trim()) return;

        setIsProcessing(true);
        setResult(null);

        try {
            // Call AI to parse the request
            const parseResponse = await fetch('/api/parse-user-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userInput,
                    image: selectedImage, // Pass the image
                    availableServices: services.map(s => ({
                        key: s.key,
                        name: s.name,
                        description: s.description,
                        fields: s.form_schema?.pages.flatMap(p => p.sections.flatMap(sec => sec.fields)) || []
                    }))
                })
            });

            if (!parseResponse.ok) {
                const errorData = await parseResponse.json();
                throw new Error(errorData.details || errorData.error || 'فشل في معالجة الطلب');
            }

            const parsed: ParsedRequest = await parseResponse.json();

            // Show preview
            setResult({
                type: 'preview',
                message: 'تم فهم طلبك! يرجى المراجعة قبل الإرسال:',
                parsedRequest: parsed
            });

        } catch (error) {
            setResult({
                type: 'error',
                message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!result?.parsedRequest) return;

        setIsProcessing(true);

        try {
            // Submit the request
            const submitResponse = await fetch('/api/submit-ai-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceKey: result.parsedRequest.serviceKey,
                    formData: result.parsedRequest.formData
                })
            });

            if (!submitResponse.ok) {
                const errorData = await submitResponse.json();
                throw new Error(errorData.details || errorData.error || 'فشل في إرسال الطلب');
            }

            const { requestId } = await submitResponse.json();

            setResult({
                type: 'success',
                message: `تم إنشاء الطلب بنجاح! رقم الطلب: ${requestId}`
            });

            setUserInput('');
            setSelectedImage(null);

            if (onRequestCreated) {
                onRequestCreated(requestId);
            }

        } catch (error) {
            setResult({
                type: 'error',
                message: error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الطلب'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="p-6 bg-gradient-to-br from-[#EFF6FF] via-white to-[#DBEAFE] border-2 border-[#93C5FD]">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-[#3B82F6] to-[#60A5FA] rounded-xl shadow-sm">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-gray-900">المساعد الذكي</h3>
                    <p className="text-sm text-gray-600">اكتب طلبك بلغتك الطبيعية وسأقوم بمساعدتك</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="مثال: أريد حجز قاعة اجتماعات يوم الأحد القادم من الساعة 10 صباحاً إلى 12 ظهراً لاجتماع فريق التطوير، نحتاج بروجكتور وسبورة ذكية..."
                        className="min-h-[120px] text-base resize-none"
                        disabled={isProcessing}
                    />

                    <div className="flex justify-start mt-2">
                        <ImageUploadButton
                            onImageSelected={(base64) => setSelectedImage(base64)}
                            disabled={isProcessing}
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={(!userInput.trim() && !selectedImage) || isProcessing}
                    className="w-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] hover:from-[#2563EB] hover:to-[#3B82F6] shadow-md hover:shadow-lg"
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            جاري المعالجة...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 ml-2" />
                            معالجة الطلب
                        </>
                    )}
                </Button>

                {/* Result Display */}
                {result && (
                    <Card className={`p-4 ${result.type === 'success' ? 'bg-green-50 border-green-200' :
                        result.type === 'error' ? 'bg-red-50 border-red-200' :
                            'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            {result.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
                            {result.type === 'error' && <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                            {result.type === 'preview' && <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />}

                            <div className="flex-1">
                                <p className={`font-medium ${result.type === 'success' ? 'text-green-900' :
                                    result.type === 'error' ? 'text-red-900' :
                                        'text-blue-900'
                                    }`}>
                                    {result.message}
                                </p>

                                {result.parsedRequest && (
                                    <div className="mt-4 space-y-3">
                                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">الخدمة المختارة:</p>
                                            <p className="text-base font-bold text-gray-900">{result.parsedRequest.serviceName}</p>
                                        </div>

                                        <div className="bg-white rounded-lg p-4 border border-blue-200">
                                            <p className="text-sm font-semibold text-gray-700 mb-3">البيانات المستخرجة:</p>
                                            <div className="space-y-2">
                                                {Object.entries(result.parsedRequest.formData).map(([key, value]) => (
                                                    <div key={key} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
                                                        <span className="text-sm text-gray-600 font-medium">{key}:</span>
                                                        <span className="text-sm text-gray-900 font-semibold text-left mr-4">
                                                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button
                                                onClick={handleConfirmSubmit}
                                                disabled={isProcessing}
                                                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                                        جاري الإرسال...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 ml-2" />
                                                        تأكيد وإرسال
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => setResult(null)}
                                                variant="outline"
                                                disabled={isProcessing}
                                                className="flex-1"
                                            >
                                                تعديل
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Examples */}
            <div className="mt-6 pt-6 border-t border-purple-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">أمثلة على الطلبات:</p>
                <div className="space-y-2">
                    {[
                        'أريد حجز قاعة اجتماعات غداً من 2 إلى 4 عصراً',
                        'أحتاج إجازة مرضية لمدة 3 أيام ابتداءً من الأحد',
                        'طلب سفر رسمي إلى دبي الأسبوع القادم لحضور مؤتمر'
                    ].map((example, idx) => (
                        <button
                            key={idx}
                            onClick={() => setUserInput(example)}
                            className="w-full text-right text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 p-2 rounded-lg transition-colors"
                            disabled={isProcessing}
                        >
                            💡 {example}
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
}
