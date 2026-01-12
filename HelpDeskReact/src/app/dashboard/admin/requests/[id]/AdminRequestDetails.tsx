'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText, User, AlertCircle, CheckCircle,
    XCircle, Clock, Activity, GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { updateRequestStatus, updateRequestFormData } from "@/app/actions";
import { SmartFormRenderer } from "@/components/form/smart-form-renderer";
import { FormSchema, RequestEvent } from "@/types";
import { RequestTimeline } from "@/components/admin/request-timeline";
import { RequestComments } from '@/components/requests/request-comments';

// Strict Types
export interface AdminRequestService {
    name: string;
    key: string;
}

export interface AdminRequestRequester {
    full_name: string | null;
    email: string | null;
}

export interface AdminRequest {
    id: string;
    request_number: string;
    status: string;
    priority: string;
    created_at: string;
    form_data: Record<string, unknown> | null;
    service: AdminRequestService | null;
    requester: AdminRequestRequester | null;
}

export interface AdminRequestLog {
    id: string;
    action_type: string;
    comment?: string;
    created_at: string;
    actor?: { full_name: string | null } | null;
    from_step_id?: string | null;
    to_step_id?: string | null;
}

export interface ActiveStep {
    stepId: string;
    name: string;
    role?: string;
    startedAt: string;
}

interface Props {
    request: AdminRequest;
    logs: AdminRequestLog[];
    events?: RequestEvent[];
    schema?: FormSchema;
    activeSteps?: ActiveStep[];
}

export default function AdminRequestDetails({ request, logs, events, schema, activeSteps }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [rejectComment, setRejectComment] = useState("");
    const [showRejectForm, setShowRejectForm] = useState(false);

    const handleAction = (newStatus: string, comment?: string) => {
        if (newStatus === 'مرفوض' && !comment) {
            toast({
                title: "خطأ",
                description: "يرجى كتابة سبب الرفض",
                variant: "destructive",
            });
            return;
        }

        const confirmMsg = newStatus === 'مرفوض'
            ? "هل أنت متأكد من رفض هذا الطلب؟"
            : "هل أنت متأكد من تغيير حالة الطلب؟";

        if (!window.confirm(confirmMsg)) return;

        startTransition(async () => {
            try {
                const result = await updateRequestStatus(request.id, newStatus, comment);
                if (result.success) {
                    toast({
                        title: "تم العملية بنجاح",
                        description: "تم تحديث حالة الطلب.",
                        className: "bg-green-50 border-green-200 text-green-900",
                    });
                    setRejectComment("");
                    setShowRejectForm(false);
                    router.refresh();
                } else {
                    toast({
                        title: "خطأ",
                        description: result.message || "حدث خطأ أثناء التحديث",
                        variant: "destructive",
                    });
                }
            } catch (error) {
                toast({
                    title: "خطأ غير متوقع",
                    description: "تعذر تحديث حالة الطلب، يرجى المحاولة لاحقًا",
                    variant: "destructive",
                });
            }
        });
    };

    // Color helpers
    const getStatusColor = (status: string) => {
        if (status === 'مكتمل') return 'bg-green-100 text-green-800';
        if (status === 'مرفوض') return 'bg-red-100 text-red-800';
        if (status === 'جديد') return 'bg-blue-100 text-blue-800';
        return 'bg-yellow-100 text-yellow-800';
    };

    const getPriorityColor = (priority: string) => {
        if (priority === 'عاجل') return 'bg-red-50 text-red-700 border-red-200';
        if (priority === 'مرتفع') return 'bg-orange-50 text-orange-700 border-orange-200';
        return 'bg-gray-50 text-gray-700 border-gray-200';
    };

    // Safe form data values
    const safeFormData = (request.form_data && typeof request.form_data === 'object')
        ? request.form_data
        : {};

    const title = typeof safeFormData.title === 'string' ? safeFormData.title : null;
    const description = typeof safeFormData.description === 'string' ? safeFormData.description : null;

    return (
        <div dir="rtl" className="space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        تفاصيل الطلب
                    </h1>
                    <p className="text-gray-500 mt-1 font-mono text-lg" dir="ltr">
                        {request.request_number}
                    </p>
                </div>
                <div>
                    <Badge className={`text-base px-4 py-1 ${getStatusColor(request.status)}`}>
                        {request.status}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Right Column: Details & Actions */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Summary Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-gray-500" />
                                معلومات أساسية
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Parallel Workflow Active Steps */}
                            {activeSteps && activeSteps.length > 0 && (
                                <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-md p-3 mb-2">
                                    <label className="text-sm text-blue-800 font-semibold mb-2 block flex items-center gap-2">
                                        <GitBranch className="w-4 h-4" />
                                        الخطوات الحالية (نشطة)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {activeSteps.map(step => (
                                            <div key={step.stepId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="font-medium text-sm text-gray-900">{step.name}</span>
                                                {step.role && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {step.role}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">الخدمة</label>
                                <div className="font-medium text-gray-900">
                                    {request.service?.name || 'غير معروف'}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">الأولوية</label>
                                <Badge variant="outline" className={getPriorityColor(request.priority)}>
                                    {request.priority}
                                </Badge>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">تاريخ الإنشاء</label>
                                <p className="font-medium text-gray-900" dir="ltr">
                                    {new Date(request.created_at).toLocaleString('en-GB')}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-gray-500 block mb-1">مقدم الطلب</label>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <div className="text-sm">
                                        <div className="font-medium">{request.requester?.full_name || 'مستخدم غير معروف'}</div>
                                        <div className="text-gray-500 text-xs">{request.requester?.email}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detailed Data Card or Smart Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-500" />
                                بيانات النموذج
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {schema ? (
                                <SmartFormRenderer
                                    schema={schema}
                                    defaultValues={safeFormData}
                                    onSubmit={async (data) => {
                                        startTransition(async () => {
                                            const res = await updateRequestFormData(request.id, data);
                                            if (res.success) {
                                                toast({ title: "تم الحفظ", description: res.message, className: "bg-green-600 text-white" });
                                                router.refresh();
                                            } else {
                                                toast({ variant: "destructive", title: "خطأ", description: res.message });
                                            }
                                        });
                                    }}
                                    isSubmitting={isPending}
                                />
                            ) : (
                                <>
                                    {title && (
                                        <div className="bg-gray-50 p-3 rounded-md border">
                                            <div className="text-sm text-gray-500 mb-1">العنوان</div>
                                            <div className="font-medium">{title}</div>
                                        </div>
                                    )}
                                    {description && (
                                        <div className="bg-gray-50 p-3 rounded-md border">
                                            <div className="text-sm text-gray-500 mb-1">الوصف</div>
                                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                                {description}
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        {Object.entries(safeFormData)
                                            .filter(([key]) => key !== 'title' && key !== 'description' && key !== 'files')
                                            .map(([key, value]) => (
                                                <div key={key} className="border-b pb-2">
                                                    <div className="text-xs text-gray-400 mb-1 uppercase">{key}</div>
                                                    <div className="text-sm text-gray-700">
                                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Admin Actions Panel */}
                    <Card className="border-blue-100 bg-blue-50/30">
                        <CardHeader>
                            <CardTitle className="text-lg text-blue-800">إجراءات إدارية</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    onClick={() => handleAction('قيد التنفيذ')}
                                    disabled={isPending || request.status === 'قيد التنفيذ' || request.status === 'مكتمل' || request.status === 'مرفوض'}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    اعتماد الطلب / بدء التنفيذ
                                </Button>

                                <Button
                                    onClick={() => handleAction('مكتمل')}
                                    disabled={isPending || request.status === 'مكتمل' || request.status === 'مرفوض'}
                                    variant="outline"
                                    className="border-green-600 text-green-600 hover:bg-green-50"
                                >
                                    إكمال الطلب
                                </Button>

                                <Button
                                    onClick={() => setShowRejectForm(!showRejectForm)}
                                    disabled={isPending || request.status === 'مكتمل' || request.status === 'مرفوض'}
                                    variant="destructive"
                                >
                                    رفض الطلب
                                </Button>
                            </div>

                            {/* Reject Form */}
                            {showRejectForm && (
                                <div className="mt-4 p-4 bg-white rounded-md border border-red-100 animation-in fade-in slide-in-from-top-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">سبب الرفض (إلزامـي)</label>
                                    <Textarea
                                        value={rejectComment}
                                        onChange={(e) => setRejectComment(e.target.value)}
                                        placeholder="يرجى كتابة سبب الرفض هنا..."
                                        className="mb-3"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowRejectForm(false)}
                                            disabled={isPending}
                                        >
                                            إلغاء
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleAction('مرفوض', rejectComment)}
                                            disabled={isPending || !rejectComment.trim()}
                                        >
                                            تأكيد الرفض
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Request Comments */}
                    <RequestComments requestId={request.id} />

                </div>

                {/* Left Column: Log */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-gray-500" />
                                سجل العمليات
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <RequestTimeline events={events || []} />

                            {/* Legacy logs fallback if needed, but Timeline is cleaner */}
                            {(!events || events.length === 0) && logs.length > 0 && (
                                <div className="mt-8 border-t pt-4">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-4 uppercase">سجل قديم</h4>
                                    <div className="space-y-6 relative border-r border-gray-200 mr-2 pr-6">
                                        {logs.map((log) => (
                                            <div key={log.id} className="relative">
                                                <div className="absolute top-1 -right-[29px] w-3 h-3 rounded-full bg-gray-300 ring-4 ring-white" />
                                                <div className="flex flex-col gap-1">
                                                    <div className="font-medium text-sm text-gray-900">
                                                        {log.action_type || 'تحديث'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {log.actor?.full_name || 'النظام'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-mono" dir="ltr">
                                                        {new Date(log.created_at).toLocaleString('en-US', { hour12: false })}
                                                    </div>
                                                    {log.comment && (
                                                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded text-gray-600 border border-gray-100">
                                                            {log.comment}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
