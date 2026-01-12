'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Bell,
    ClipboardList,
    CheckCircle,
    XCircle,
    AlertTriangle,
    UserPlus,
    Check
} from "lucide-react";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    link?: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/notifications');
            if (!res.ok) throw new Error('فشل جلب الإشعارات');
            const data = await res.json();
            setNotifications(data);
        } catch (err) {
            setError('حدث خطأ أثناء جلب الإشعارات');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            const res = await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });
            if (res.ok) {
                // Optimistic update or refresh
                fetchNotifications();
            }
        } catch (err) {
            console.error('Failed to mark all as read', err);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Optimistically update UI
        setNotifications(prev =>
            prev.map(n =>
                n.id === notification.id ? { ...n, is_read: true } : n
            )
        );

        try {
            await fetch(`/api/notifications/${notification.id}/mark-read`, {
                method: "POST",
                keepalive: true // Ensure request survives navigation
            });
        } catch (e) {
            console.error("Failed to mark as read", e);
        }

        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.is_read;
        return n.type === filter;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'task_assigned': return <UserPlus className="h-5 w-5 text-blue-500" />;
            case 'request_created': return <ClipboardList className="h-5 w-5 text-yellow-500" />;
            case 'request_approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'request_rejected': return <XCircle className="h-5 w-5 text-red-500" />;
            case 'request_completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
            default: return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const filters = [
        { id: 'all', label: 'الكل' },
        { id: 'unread', label: 'غير مقروء' },
        { id: 'task_assigned', label: 'تعيين مهمة' },
        { id: 'request_created', label: 'طلب جديد' },
        { id: 'request_approved', label: 'تم الاعتماد' },
        { id: 'request_rejected', label: 'مرفوض' },
        { id: 'request_completed', label: 'اكتمل الطلب' },
        { id: 'warning', label: 'تحذير' },
    ];

    return (
        <div className="container mx-auto py-8 max-w-5xl px-4" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">مركز الإشعارات</h1>
                <Button onClick={handleMarkAllRead} variant="outline" className="gap-2">
                    <Check className="h-4 w-4" />
                    تمييز الكل كمقروء
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white p-2 rounded-lg border shadow-sm flex flex-wrap gap-2 mb-6">
                {filters.map(f => (
                    <Button
                        key={f.id}
                        variant={filter === f.id ? "secondary" : "ghost"}
                        className={`text-sm ${filter === f.id ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'text-gray-600 hover:text-gray-900'}`}
                        size="sm"
                        onClick={() => setFilter(f.id)}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {/* Error Message */}
            {error && (
                <div className="text-center p-4 text-red-500 bg-red-50 rounded-md mb-4">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="text-center py-20 text-gray-500 border-2 border-dashed rounded-lg">
                            لا توجد إشعارات.
                        </div>
                    ) : (
                        filteredNotifications.map(notification => (
                            <Card
                                key={notification.id}
                                className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${!notification.is_read ? 'bg-blue-50/30 border-l-blue-500 border-y-gray-200 border-r-gray-200' : 'bg-white border-l-gray-300 border-gray-200'} hover:border-l-blue-600 group`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <CardHeader className="flex flex-row items-start gap-4 pb-2 space-y-0">
                                    <div className="mt-1">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-semibold">
                                                {notification.title}
                                            </CardTitle>
                                            {!notification.is_read && (
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                    غير مقروء
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(notification.created_at).toLocaleString('en-GB')}
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 pr-14">
                                    <p className="text-sm text-gray-700 leading-relaxed">
                                        {notification.message}
                                    </p>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
