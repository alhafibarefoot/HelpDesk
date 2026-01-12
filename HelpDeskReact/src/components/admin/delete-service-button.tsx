"use client"

import { useState } from "react";
import { Trash2, Loader2, Archive } from "lucide-react";
import { archiveService } from "@/app/actions";
import { useRouter } from "next/navigation";

interface DeleteServiceButtonProps {
    serviceId: string;
    serviceName: string;
}

export function DeleteServiceButton({ serviceId, serviceName }: DeleteServiceButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm(`هل أنت متأكد من أرشفة خدمة "${serviceName}"؟\nستختفي الخدمة من القائمة الرئيسية ولكن يمكن استعادتها لاحقاً.`)) {
            return;
        }

        setIsDeleting(true);
        setErrorMsg(null);
        try {
            await archiveService(serviceId);
            // Force refresh
            router.refresh();
            window.location.reload();
        } catch (error) {
            console.error(error);
            setErrorMsg(error instanceof Error ? error.message : 'حدث خطأ غير معروف');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-3 hover:bg-orange-50 rounded-xl transition-colors group"
                title="أرشفة الخدمة"
            >
                {isDeleting ? (
                    <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                ) : (
                    <Archive className="w-5 h-5 text-gray-600 group-hover:text-orange-600" />
                )}
            </button>

            {errorMsg && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-100 animate-in fade-in zoom-in duration-200 overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-red-600">
                                <div className="p-2 bg-red-100 rounded-full">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold">فشل عملية الحذف</h3>
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
