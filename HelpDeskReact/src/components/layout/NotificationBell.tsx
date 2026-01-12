'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/notifications/unread-count');
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread notifications count', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        // Poll every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleClick = () => {
        router.push('/dashboard/notifications');
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleClick}
            aria-label="الإشعارات"
        >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
                <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full animate-in zoom-in"
                >
                    {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
            )}
        </Button>
    );
}
