'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { upsertService, ServiceFormData } from "./actions";
import { AdminService } from "./page";

interface ServiceFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: AdminService | null;
    onSaved?: () => void;
}

export default function ServiceForm({ open, onOpenChange, service, onSaved }: ServiceFormProps) {
    const router = useRouter();
    const isEdit = !!service;

    // Form State
    const [name, setName] = useState("");
    const [key, setKey] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);

    // UX State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Reset or Populate on Open
    useEffect(() => {
        if (open) {
            setName(service?.name ?? "");
            setKey(service?.key ?? "");
            setDescription(service?.description ?? "");
            setIsActive(service?.is_active ?? true);
            setError(null);
            setSuccess(null);
        }
    }, [open, service]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!name.trim() || !key.trim()) {
            setError("يرجى تعبئة جميع الحقول الإلزامية.");
            return;
        }

        setIsSubmitting(true);

        const payload: ServiceFormData = {
            id: service?.id,
            name: name.trim(),
            key: key.trim(),
            description: description.trim() || null,
            is_active: isActive,
        };

        const result = await upsertService(payload);

        setIsSubmitting(false);

        if (!result.success) {
            setError(result.message);
            return;
        }

        setSuccess(result.message);

        // Brief delay to show success message before closing (optional but nice)
        setTimeout(() => {
            if (onSaved) onSaved();
            onOpenChange(false);
            router.refresh();

            // Should redirect to the NEW Unified Editor if creating new service
            if (!isEdit) {
                router.push(`/dashboard/admin/services/${key}`);
            }
        }, 1000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent dir="rtl" className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">

                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            {success}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>اسم الخدمة <span className="text-red-500">*</span></Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="مثال: صيانة أجهزة"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>المفتاح التقني (Key) <span className="text-red-500">*</span></Label>
                        <Input
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="example: it_support"
                            className="font-mono text-sm"
                            dir="ltr"
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-gray-500">يُستخدم هذا المفتاح كمعرف فريد للخدمة في النظام.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>وصف الخدمة</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="اكتب وصفاً مختصراً للخدمة..."
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                        <Label className="cursor-pointer" htmlFor="is-active">تفعيل الخدمة</Label>
                        <Switch
                            id="is-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            disabled={isSubmitting}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !!success}
                            className={success ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    تم الحفظ
                                </>
                            ) : (
                                isEdit ? "تحديث" : "حفظ"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
