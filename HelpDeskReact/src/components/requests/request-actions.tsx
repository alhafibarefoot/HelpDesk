"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { updateRequestStatus } from "@/app/actions";
import { useRouter } from "next/navigation";

interface RequestActionsProps {
    requestId: string;
    currentStatus: string;
    canApprove?: boolean;
    canReject?: boolean;
}

export function RequestActions({ requestId, currentStatus, canApprove = false, canReject = false }: RequestActionsProps) {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // If request is completed or rejected, no actions available (for now)
    if (['مكتمل', 'مرفوض', 'mlaghi'].includes(currentStatus)) {
        return null;
    }

    // RBAC: If no permissions at all, show message or hide
    if (!canApprove && !canReject) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-500">
                ليس لديك صلاحية لاتخاذ إجراء على هذا الطلب حالياً.
            </div>
        );
    }

    const handleAction = async (newStatus: string) => {
        if (!confirm(newStatus === 'مكتمل' || newStatus === 'قيد التنفيذ' ? 'هل أنت متأكد من الموافقة على هذا الطلب؟' : 'هل أنت متأكد من رفض هذا الطلب؟')) {
            return;
        }

        setIsProcessing(true);
        try {
            const result = await updateRequestStatus(requestId, newStatus);

            if (result.success) {
                router.refresh();
                // Force reload as a fallback
                // window.location.reload(); // Removed to be cleaner
            } else {
                alert(result.message || "حدث خطأ أثناء معالجة الطلب");
            }
        } catch (error) {
            console.error("Action Error:", error);
            alert("حدث خطأ غير متوقع");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">الإجراءات</p>
                <p className="text-xs text-gray-500">اتخذ إجراء بشأن هذا الطلب</p>
            </div>

            {canReject && (
                <Button
                    onClick={() => handleAction('مرفوض')}
                    disabled={isProcessing}
                    variant="destructive"
                    className="gap-2"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    رفض
                </Button>
            )}

            {canApprove && (
                <Button
                    onClick={() => handleAction('مكتمل')} // Or 'قيد التنفيذ' depending on flow
                    disabled={isProcessing}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    موافقة
                </Button>
            )}
        </div>
    );
}
