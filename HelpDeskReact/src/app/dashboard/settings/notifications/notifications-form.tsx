'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface NotificationsFormProps {
    initialPreferences: Record<string, boolean>;
}

const NOTIFICATION_TYPES = [
    {
        id: 'task_assigned',
        label: 'تعيين مهمة جديدة',
        description: 'استلام إشعار عندما يتم إسناد طلب إليك للمراجعة أو الاعتماد.'
    },
    {
        id: 'request_created',
        label: 'إنشاء طلب جديد',
        description: 'استلام إشعار عند إنشاء طلب جديد خاص بك.'
    },
    {
        id: 'request_approved',
        label: 'تم اعتماد الطلب',
        description: 'استلام إشعار عند اعتماد طلبك.'
    },
    {
        id: 'request_rejected',
        label: 'تم رفض الطلب',
        description: 'استلام إشعار عند رفض طلبك.'
    },
    {
        id: 'request_completed',
        label: 'اكتمل تنفيذ الطلب',
        description: 'استلام إشعار عند إكمال معالجة طلبك.'
    },
    {
        id: 'warning',
        label: 'تنبيهات وتحذيرات',
        description: 'استلام رسائل تنبيه أو تحذيرات خاصة.'
    }
];

export default function NotificationsForm({ initialPreferences }: NotificationsFormProps) {
    // Default to true if key is missing
    const [preferences, setPreferences] = useState<Record<string, boolean>>(initialPreferences);

    const handleToggle = async (typeId: string, newValue: boolean) => {
        // Optimistic Update
        setPreferences(prev => ({
            ...prev,
            [typeId]: newValue
        }));

        try {
            await fetch('/api/notification-preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notificationType: typeId,
                    enabled: newValue
                })
            });
        } catch (error) {
            console.error('Failed to save preference', error);
            // Revert state on error? (Optional, skipping for simplicity)
        }
    };

    return (
        <div className="space-y-4">
            {NOTIFICATION_TYPES.map(type => {
                const isEnabled = preferences[type.id] !== false; // Default true

                return (
                    <Card key={type.id} className="shadow-sm">
                        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle className="text-base font-medium leading-none">
                                    {type.label}
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-500">
                                    {type.description}
                                </CardDescription>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onCheckedChange={(val) => handleToggle(type.id, val)}
                                dir="ltr" /* Force switch direction standard */
                            />
                        </CardHeader>
                    </Card>
                );
            })}
        </div>
    );
}
