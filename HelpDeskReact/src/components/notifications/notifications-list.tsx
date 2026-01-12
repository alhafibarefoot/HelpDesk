'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { arMA } from 'date-fns/locale';

type Notification = {
    id: string;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
    link?: string;
    type: string;
};

export function NotificationsList({ initialNotifications }: { initialNotifications: Notification[] }) {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const router = useRouter();
    const supabase = createClient();

    const handleMarkAllRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (!error) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                router.refresh(); // Update server components (like the bell count if it was server side, though bell is client)
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleMarkAsRead = async (id: string, link?: string) => {
        if (link) {
            // If clicking link, mark as read and navigate
            try {
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            } catch (e) { console.error(e); }
            router.push(link);
        } else {
            // Just mark as read
            try {
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                router.refresh();
            } catch (e) { console.error(e); }
        }
    };

    if (notifications.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">لا توجد إشعارات</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">الإشعارات</h2>
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                    <CheckCheck className="w-4 h-4 ml-2" />
                    تمييز الكل كمقروء
                </Button>
            </div>

            <div className="grid gap-2">
                {notifications.map((notification) => (
                    <Card
                        key={notification.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notification.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                        onClick={() => handleMarkAsRead(notification.id, notification.link)}
                    >
                        <CardContent className="p-4 flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-medium ${!notification.is_read ? 'text-primary' : ''}`}>
                                    {notification.title}
                                </h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: arMA })}
                                </span>
                            </div>
                            <p className="text-sm text-foreground/80">{notification.message}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
