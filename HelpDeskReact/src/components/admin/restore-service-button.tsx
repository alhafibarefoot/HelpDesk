"use client"

import { useState } from "react";
import { RotateCcw, Loader2, RefreshCcw, AlertTriangle } from "lucide-react";
import { restoreService } from "@/app/actions";
import { useRouter } from "next/navigation";

interface RestoreServiceButtonProps {
    serviceId: string;
    serviceName: string;
}

export function RestoreServiceButton({ serviceId, serviceName }: RestoreServiceButtonProps) {
    const [isRestoring, setIsRestoring] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    const handleRestore = async () => {
        if (!confirm(`هل أنت متأكد من استعادة خدمة "${serviceName}"؟\nستعود الخدمة كـ "مسودة" ويمكنك تفعيلها لاحقاً.`)) {
            return;
        }

        setIsRestoring(true);
        setErrorMsg(null);
        try {
            await restoreService(serviceId);
            // Force refresh
            router.refresh();
            window.location.reload();
        } catch (error) {
            console.error(error);
            setErrorMsg(error instanceof Error ? error.message : 'حدث خطأ غير معروف');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleRestore}
                disabled={isRestoring}
                className="p-3 hover:bg-green-50 rounded-xl transition-colors group"
                title="استعادة الخدمة"
            >
                {isRestoring ? (
                    <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                ) : (
                    <RotateCcw className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
                )}
            </button>

            {errorMsg && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold">فشل عملية الاستعادة</h3>
                            </div>

                            <div className="bg-red-50 p-4 rounded-xl mb-6 text-red-900 text-sm leading-relaxed border border-red-100">
                                <p className="font-semibold mb-1">السبب:</p>
                                {errorMsg}
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setErrorMsg(null)}
                                    className="bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-black transition-colors font-medium w-full sm:w-auto"
                                >
                                    فهمت، إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
