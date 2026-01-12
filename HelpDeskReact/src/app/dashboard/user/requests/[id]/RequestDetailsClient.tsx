'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Clock, CheckCircle, XCircle, AlertCircle, FileText, MessageSquare,
    Send, Calendar, User, Paperclip, Download, Loader2, Eye, Trash2
} from 'lucide-react';
import { RequestTimelineStepper } from '@/components/dashboard/request-timeline-stepper';

interface RequestDetailsProps {
    request: any;
    currentUser: any;
    initialEvents: any[];
    workflowNodes?: any[];
    schema?: any; // FormSchema type but using any to avoid huge import dependency tree in client component if possible, or import it.
}

interface Attachment {
    id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    created_at: string;
    url?: string;
    uploader?: { full_name: string };
    uploaded_by?: string;
}

export default function RequestDetailsClient({ request, currentUser, initialEvents, workflowNodes, schema }: RequestDetailsProps) {
    const router = useRouter();
    const [actionLoading, setActionLoading] = useState(false);

    // Comments state
    const [comments, setComments] = useState<any[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [commentSending, setCommentSending] = useState(false);

    // Attachments state
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [attachmentsLoading, setAttachmentsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

    // Initial load
    useEffect(() => {
        fetchComments();
        fetchAttachments();
    }, []);

    const fetchComments = async () => {
        setCommentsLoading(true);
        try {
            const res = await fetch(`/api/requests/${request.id}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } finally {
            setCommentsLoading(false);
        }
    };

    const fetchAttachments = async () => {
        setAttachmentsLoading(true);
        try {
            const res = await fetch(`/api/requests/${request.id}/attachments`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setAttachments(data);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAttachmentsLoading(false);
        }
    };

    const handleAction = async (action: 'approve' | 'reject' | 'complete') => {
        if (!confirm('هل أنت متأكد من تنفيذ هذا الإجراء؟')) return;

        setActionLoading(true);
        try {
            const res = await fetch(`/api/requests/${request.id}/actions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });

            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "حدث خطأ");
                return;
            }

            // Success
            alert("تم تنفيذ الإجراء بنجاح");
            router.refresh();
        } catch (error) {
            console.error(error);
            alert("فشل الاتصال بالخادم");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setCommentSending(true);
        try {
            const res = await fetch(`/api/requests/${request.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newComment })
            });

            if (res.ok) {
                const savedComment = await res.json();
                setComments(prev => [...prev, savedComment]);
                setNewComment("");
            } else {
                const err = await res.json();
                console.error("Comment submission error:", err);
                alert(`فشل إرسال التعليق: ${err.error || 'خطأ غير معروف'}`);
            }
        } finally {
            setCommentSending(false);
        }
    };

    const handleUpload = async () => {
        if (!fileToUpload) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', fileToUpload);

            const res = await fetch(`/api/requests/${request.id}/attachments`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                alert(`فشل الرفع: ${err.error || 'خطأ غير معروف'}`);
                return;
            }

            // Refetch to get new list + signed URLs
            fetchAttachments();
            setFileToUpload(null);
            alert("تم إضافة المرفق بنجاح");
        } catch (e) {
            console.error(e);
            alert("حدث خطأ أثناء الرفع");
        } finally {
            setUploading(false);
        }
    };

    // Helper: Status Color
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'مكتمل': return 'bg-green-100 text-green-800';
            case 'مرفوض': return 'bg-red-100 text-red-800';
            case 'قيد التنفيذ': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    // Helper: Can current user perform action?
    const canAct = (
        (currentUser.role === request.assigned_role) ||
        (currentUser.id === request.assigned_to_user) ||
        (['admin', 'helpdesk_admin'].includes(currentUser.role))
    ) && !['مكتمل', 'مرفوض', 'mlghi', 'cancelled', 'cancelled by Admin'].includes(request.status);

    // Can upload? (Requester or Assigned)
    const canUpload = (currentUser.id === request.requester_id) || (currentUser.role === request.assigned_role);

    const serviceName = request.service?.name || "خدمة";

    const handleDeleteFile = async (file: Attachment) => {
        if (!confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;

        const originalAttachments = [...attachments];
        setAttachments(prev => prev.filter(a => a.id !== file.id));

        try {
            const res = await fetch(`/api/requests/${request.id}/attachments`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attachment_id: file.id })
            });

            if (!res.ok) {
                setAttachments(originalAttachments);
                const data = await res.json();
                alert(data.error || 'فشل الحذف');
            } else {
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            setAttachments(originalAttachments);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    return (
        <div dir="rtl" className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-gray-500">#{request.request_number}</Badge>
                        <h1 className="text-2xl font-bold text-gray-900">طلب: {serviceName}</h1>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusVariant(request.status)}`}>
                            {request.status}
                        </span>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(request.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>
                </div>
                {request.assigned_role && (
                    <div className="text-left md:text-left rtl:text-left">
                        <div className="text-xs text-gray-500">الدور الحالي</div>
                        <Badge variant="secondary">{request.assigned_role}</Badge>
                    </div>
                )}
            </div>

            {/* Stepper & Duration */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <RequestTimelineStepper
                    status={request.status}
                    createdAt={request.created_at}
                    assignedRole={request.assigned_role}
                    workflowNodes={workflowNodes}
                    lastStatusChange={
                        // Find the most recent status change event
                        initialEvents
                            .filter(e => e.event_type === 'status_changed')
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
                        || request.created_at
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Side: Tabs (Main Content) */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-white border">
                            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                            <TabsTrigger value="timeline">الجدول الزمني</TabsTrigger>
                            <TabsTrigger value="comments">التعليقات</TabsTrigger>
                            <TabsTrigger value="attachments">المرفقات</TabsTrigger>
                        </TabsList>

                        <div className="bg-white border border-t-0 p-6 rounded-b-lg min-h-[400px]">
                            {/* OVERVIEW */}
                            <TabsContent value="overview" className="mt-0 space-y-4">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    تفاصيل الطلب
                                </h3>

                                {request.form_data && (schema ? (
                                    // Schema-driven rendering (Respects Permissions)
                                    <div className="space-y-6">
                                        {schema.pages.map((page: any) => (
                                            <div key={page.id} className="space-y-4">
                                                {page.sections.map((section: any) => (
                                                    <div key={section.id} className="bg-gray-50 p-4 rounded-lg border">
                                                        {section.title && <h4 className="font-semibold text-gray-700 mb-3">{section.title}</h4>}
                                                        <div className={`grid gap-4 ${section.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                                                            {section.fields.map((field: any) => {
                                                                // THE MAGIC: If hidden is true, we skip it!
                                                                if (field.hidden) return null;

                                                                const val = request.form_data[field.key];
                                                                // Skip empty values? Maybe not, show -

                                                                return (
                                                                    <div key={field.key} className={field.width === 'full' ? 'col-span-full' : ''}>
                                                                        <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                                                                        <div className="font-medium text-gray-900 break-words">
                                                                            {val !== undefined && val !== null && val !== '' ? (
                                                                                typeof val === 'object' ? JSON.stringify(val) : String(val)
                                                                            ) : '-'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // Fallback: Raw Data Dump
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(request.form_data).map(([key, value]) => (
                                            <div key={key} className="bg-gray-50 p-3 rounded border">
                                                <div className="text-xs text-gray-500 mb-1">{key}</div>
                                                <div className="font-medium text-gray-900">
                                                    {(() => {
                                                        if (value === null || value === undefined) return '-';
                                                        if (typeof value === 'string' && value.startsWith('{')) {
                                                            try {
                                                                const parsed = JSON.parse(value);
                                                                return parsed.label || parsed.value || value;
                                                            } catch (e) {
                                                                return value;
                                                            }
                                                        }
                                                        return String(value);
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                {!request.form_data && (
                                    <div className="text-gray-500 text-center py-10">لا توجد تفاصيل إضافية لهذا الطلب</div>
                                )}
                            </TabsContent>

                            {/* TIMELINE */}
                            <TabsContent value="timeline" className="mt-0">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    سجل الأحداث
                                </h3>
                                <div className="space-y-6 relative border-r pr-6 mx-2 border-gray-200">
                                    {initialEvents.length === 0 && <div className="text-gray-500">لا توجد أحداث</div>}
                                    {initialEvents.map((evt) => {
                                        let Icon = User;
                                        let color = "bg-gray-200";
                                        let title = "حدث";

                                        if (evt.event_type === 'status_changed') {
                                            Icon = evt.new_status === 'مكتمل' ? CheckCircle :
                                                evt.new_status === 'مرفوض' ? XCircle : AlertCircle;
                                            color = evt.new_status === 'مكتمل' ? "bg-green-100 text-green-600" :
                                                evt.new_status === 'مرفوض' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600";
                                            title = `تغيير الحالة إلى: ${evt.new_status}`;
                                        } else if (evt.event_type === 'comment_added') {
                                            Icon = MessageSquare;
                                            color = "bg-purple-100 text-purple-600";
                                            title = "إضافة تعليق";
                                        } else if (evt.event_type === 'attachment_added') {
                                            Icon = Paperclip;
                                            color = "bg-orange-100 text-orange-600";
                                            title = "إضافة مرفق";
                                        } else if (evt.event_type === 'attachment_deleted') {
                                            Icon = Trash2;
                                            color = "bg-red-100 text-red-600";
                                            title = "حذف مرفق";
                                        }

                                        return (
                                            <div key={evt.id} className="relative">
                                                <div className={`absolute top-0 -right-[34px] w-8 h-8 rounded-full flex items-center justify-center ${color} border-2 border-white shadow-sm`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{title}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                                        <span>{evt.actor?.full_name || 'النظام'}</span>
                                                        <span>•</span>
                                                        <span>{new Date(evt.created_at).toLocaleString('en-GB')}</span>
                                                    </div>

                                                    {/* Attachment Details */}
                                                    {(evt.payload?.file_name || evt.meta?.file_name) && (
                                                        <div className="text-xs text-gray-600 mt-1 bg-blue-50 text-blue-700 inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-100">
                                                            <Paperclip className="h-3 w-3" />
                                                            {evt.payload?.file_name || evt.meta?.file_name}
                                                        </div>
                                                    )}

                                                    {/* Comment Details */}
                                                    {(evt.payload?.content) && (
                                                        <div className="text-xs text-gray-600 mt-1 bg-gray-50 px-2 py-1 rounded border border-gray-100 italic">
                                                            "{evt.payload.content}"
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </TabsContent>

                            {/* COMMENTS */}
                            <TabsContent value="comments" className="mt-0">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-gray-400" />
                                    التعليقات والمناقشات
                                </h3>

                                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto p-1">
                                    {commentsLoading && <div className="text-center text-gray-500">جاري التحميل...</div>}
                                    {!commentsLoading && comments.length === 0 && (
                                        <div className="text-center text-gray-500 py-4 bg-gray-50 rounded">لا توجد تعليقات حتى الآن</div>
                                    )}
                                    {comments.map((comment) => (
                                        <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {comment.author?.full_name?.[0] || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-gray-900">{comment.author?.full_name || 'مستخدم'}</div>
                                                        <div className="text-xs text-gray-500">{comment.author?.role || 'مستخدم'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400" dir="ltr">
                                                    {new Date(comment.created_at).toLocaleString('en-GB')}
                                                </div>
                                            </div>
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 items-start mt-4 pt-4 border-t">
                                    <Textarea
                                        placeholder="كتب تعليقك هنا..."
                                        className="min-h-[80px]"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                    />
                                    <Button
                                        onClick={handlePostComment}
                                        disabled={commentSending || !newComment.trim()}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {commentSending ? '...' : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* ATTACHMENTS */}
                            <TabsContent value="attachments" className="mt-0">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Paperclip className="h-5 w-5 text-gray-400" />
                                    المرفقات
                                </h3>

                                <div className="space-y-4">
                                    {/* Upload Area */}
                                    {canUpload && (
                                        <div className="p-4 bg-gray-50 border rounded-lg flex items-center gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    className="block w-full text-sm text-gray-500 file:ml-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                                                />
                                            </div>
                                            <Button
                                                onClick={handleUpload}
                                                disabled={!fileToUpload || uploading}
                                                className="min-w-[120px]"
                                            >
                                                {uploading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                                {uploading ? 'جاري الرفع...' : 'رفع ملف'}
                                            </Button>
                                        </div>
                                    )}

                                    {/* List */}
                                    {attachmentsLoading ? (
                                        <div className="text-center py-8 text-gray-500">جاري تحميل المرفقات...</div>
                                    ) : attachments.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                                            لا توجد مرفقات لهذا الطلب
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {attachments.map((file) => (
                                                <div key={file.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 text-sm">{file.file_name}</div>
                                                            <div className="text-xs text-gray-500 flex gap-2">
                                                                <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                                                                {file.uploader?.full_name && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>واسطة: {file.uploader.full_name}</span>
                                                                    </>
                                                                )}
                                                                <span>•</span>
                                                                <span dir="ltr">{new Date(file.created_at).toLocaleDateString('en-GB')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
                                                        <Download className="h-4 w-4 ml-2" />
                                                        تحميل
                                                    </Button>
                                                    {(file.file_type.startsWith('image/') || file.file_type === 'application/pdf') && (
                                                        <Button variant="ghost" size="sm" onClick={() => setPreviewFile(file)}>
                                                            <Eye className="h-4 w-4 ml-2" />
                                                            معاينة
                                                        </Button>
                                                    )}
                                                    {(currentUser.id === file.uploaded_by || ['admin', 'helpdesk_admin'].includes(currentUser.role)) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteFile(file)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4 ml-2" />
                                                            حذف
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Right Side: Quick Actions & Info */}
                <div className="space-y-6">
                    {/* Actions Card */}
                    <Card>
                        <CardHeader className="bg-gray-50 border-b pb-3">
                            <CardTitle className="text-base">إجراءات الطلب</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {canAct ? (
                                <div className="space-y-3">
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleAction('approve')}
                                        disabled={actionLoading}
                                    >
                                        <CheckCircle className="ml-2 h-4 w-4" />
                                        اعتماد الطلب
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleAction('reject')}
                                        disabled={actionLoading}
                                    >
                                        <XCircle className="ml-2 h-4 w-4" />
                                        رفض الطلب
                                    </Button>
                                    {/* Optional Return Button */}
                                    {/* <Button variant="outline" className="w-full text-yellow-600 border-yellow-200 hover:bg-yellow-50">إعادة للطالب</Button> */}
                                </div>
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-2">
                                    {request.status === 'مكتمل' ? 'هذا الطلب مكتمل.' :
                                        request.status === 'مرفوض' ? 'هذا الطلب مرفوض.' :
                                            'لا توجد إجراءات متاحة لك حالياً.'}
                                </div>
                            )}

                            {/* Duplicate Action (For Cancelled/Rejected/Completed Requests) */}
                            {['m_approved', 'approved', 'completed', 'rejected', 'cancelled'].includes(request.status) && (
                                <div className="mt-4 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                        onClick={() => router.push(`/dashboard/user/requests/new?clone_from=${request.id}`)}
                                    >
                                        <FileText className="ml-2 h-4 w-4" />
                                        نسخ وتعديل الطلب
                                    </Button>
                                    <p className="text-xs text-center text-gray-500 mt-2">
                                        إنشاء طلب جديد بناءً على بيانات هذا الطلب.
                                    </p>
                                </div>
                            )}

                            {/* Withdraw Action (Requester Only) */}
                            {currentUser.id === request.requester_id && !['m_approved', 'approved', 'completed', 'rejected', 'cancelled'].includes(request.status) && (
                                <div className="mt-4 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={async () => {
                                            if (!confirm('هل أنت متأكد من سحب الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) return;
                                            setActionLoading(true);
                                            try {
                                                const { withdrawRequest } = await import('@/app/actions');
                                                const res = await withdrawRequest(request.id);
                                                if (res.success) {
                                                    alert(res.message);
                                                    router.refresh();
                                                } else {
                                                    alert(res.message || 'فشل سحب الطلب');
                                                }
                                            } catch (e: any) {
                                                alert(e.message || 'حدث خطأ');
                                            } finally {
                                                setActionLoading(false);
                                            }
                                        }}
                                        disabled={actionLoading}
                                    >
                                        <XCircle className="ml-2 h-4 w-4" />
                                        سحب الطلب
                                    </Button>
                                    <p className="text-xs text-center text-gray-500 mt-2">
                                        يمكنك سحب الطلب طالما لم يتم اتخاذ أي إجراء عليه.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Info Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-gray-700">بيانات سريعة</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">رقم الطلب</span>
                                <span className="font-mono font-bold">#{request.request_number}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">الحالة</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusVariant(request.status)}`}>{request.status}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">مقدم الطلب</span>
                                <span className="font-medium">
                                    {request.requester_id === currentUser.id ? 'أنت' : request.requester_id.substring(0, 8)}
                                </span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">تاريخ الإنشاء</span>
                                <span>{new Date(request.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
                <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-right">{previewFile?.file_name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4 rounded border">
                        {previewFile?.file_type?.startsWith('image/') ? (
                            <img
                                src={previewFile.url}
                                alt={previewFile.file_name}
                                className="max-w-full max-h-full object-contain"
                            />
                        ) : previewFile?.file_type === 'application/pdf' ? (
                            <iframe
                                src={previewFile.url}
                                className="w-full h-full"
                                title={previewFile.file_name}
                            />
                        ) : (
                            <div className="text-gray-500">لا يمكن معاينة هذا الملف</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
