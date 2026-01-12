'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

type Notification = {
    id: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    link?: string;
    type: string;
};

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const fetchNotifications = async () => {
        try {
            // Fetch latest 5 notifications
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (data) {
                setNotifications(data);
            }

            // Fetch unread count
            const { count, error: countError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false);

            if (count !== null) setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();

        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id: string, link?: string) => {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            // Update local state optimistically
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            router.refresh(); // Refresh server components if needed
        } catch (e) {
            console.error("Failed to mark read", e);
        }

        setIsOpen(false);
    };

    const handleMarkAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
                router.refresh();
            }
        } catch (e) {
            console.error("Failed to mark all read", e);
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">الإشعارات</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white z-[100] shadow-xl border border-gray-200">
                <div dir="rtl">
                    <DropdownMenuLabel className="flex justify-between items-center">
                        <span>الإشعارات</span>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleMarkAllAsRead}>
                                تمييز الكل كمقروء
                            </Button>
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                لا توجد إشعارات جديدة
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.is_read ? 'bg-muted/50' : ''}`}
                                    onSelect={() => {
                                        handleMarkAsRead(notification.id);
                                        if (notification.link) {
                                            window.location.href = notification.link;
                                        }
                                    }}
                                >
                                    <div className="flex justify-between w-full">
                                        <span className="font-medium text-sm">{notification.title}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(notification.created_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                        <Link href="/dashboard/notifications" passHref>
                            <Button variant="outline" className="w-full text-xs" onClick={() => setIsOpen(false)}>
                                عرض كل الإشعارات
                            </Button>
                        </Link>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
