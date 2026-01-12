'use client';

import { RequestEvent } from "@/types";
import { format } from "date-fns";
import { enGB } from "date-fns/locale";
import { CheckCircle, Clock, Edit, AlertCircle, MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    events: RequestEvent[];
}

export function RequestTimeline({ events }: Props) {
    if (!events || events.length === 0) {
        return <div className="text-gray-500 text-sm py-4 text-center">لا يوجد سجل نشاط حتى الآن</div>;
    }

    return (
        <div className="space-y-6">
            {events.map((event, index) => (
                <div key={event.id} className="flex gap-4 relative">
                    {/* Vertical Line */}
                    {index !== events.length - 1 && (
                        <div className="absolute top-8 right-[15px] bottom-[-24px] w-0.5 bg-gray-200" />
                    )}

                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                        <EventIcon type={event.event_type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                                {getEventTitle(event)}
                            </p>
                            <span className="text-xs text-gray-400 font-mono" dir="ltr">
                                {format(new Date(event.performed_at), "dd/MM/yyyy HH:mm", { locale: enGB })}
                            </span>
                        </div>

                        <p className="text-sm text-gray-600">
                            قام به: <span className="font-medium text-gray-800">{event.performer?.full_name || 'النظام'}</span>
                        </p>

                        {/* Comment Payload */}
                        {(event.payload?.comment || event.payload?.content) && (
                            <div className="mt-2 bg-gray-50 border border-gray-100 p-2 rounded text-sm text-gray-700 italic">
                                "{event.payload?.comment || event.payload?.content}"
                            </div>
                        )}

                        {/* Attachment Payload */}
                        {(event.payload?.file_name || event.meta?.file_name) && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 p-2 rounded text-sm text-blue-700 flex items-center gap-2 w-fit">
                                <Paperclip className="h-4 w-4" />
                                {event.payload?.file_name || event.meta?.file_name}
                            </div>
                        )}

                        {event.payload?.message && (
                            <p className="text-xs text-gray-500">{event.payload.message}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function EventIcon({ type }: { type: string }) {
    let icon = <Clock className="w-5 h-5 text-gray-500" />;
    let bg = "bg-gray-100";

    switch (type) {
        case 'status_change':
        case 'status_changed':
            icon = <CheckCircle className="w-5 h-5 text-green-600" />;
            bg = "bg-green-100";
            break;
        case 'field_update':
            icon = <Edit className="w-5 h-5 text-blue-600" />;
            bg = "bg-blue-100";
            break;
        case 'comment':
        case 'comment_added':
            icon = <MessageSquare className="w-5 h-5 text-yellow-600" />;
            bg = "bg-yellow-100";
            break;
        case 'attachment_added':
            icon = <Paperclip className="w-5 h-5 text-purple-600" />;
            bg = "bg-purple-100";
            break;
        case 'attachment_deleted':
            icon = <Trash2 className="w-5 h-5 text-red-600" />;
            bg = "bg-red-100";
            break;
        case 'sla_breach':
            icon = <AlertCircle className="w-5 h-5 text-red-600" />;
            bg = "bg-red-100";
            break;
    }

    return (
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border", bg)}>
            {icon}
        </div>
    );
}

function getEventTitle(event: RequestEvent) {
    if (event.event_type === 'status_change' || event.event_type === 'status_changed') {
        const from = event.payload?.from_status || '...';
        const to = event.payload?.to_status || '...';
        return `تغيير الحالة من ${from} إلى ${to}`;
    }
    if (event.event_type === 'field_update') return "تحديث بيانات الطلب";
    if (event.event_type === 'comment' || event.event_type === 'comment_added') return "إضافة تعليق";
    if (event.event_type === 'attachment_added') return "إضافة مرفق";
    if (event.event_type === 'attachment_deleted') return "حذف مرفق";
    if (event.event_type === 'sla_breach') return "تجاوز اتفاقية مستوى الخدمة";
    return "نشاط غير معروف";
}
