
'use client'

import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { markAllAsReadAction } from "@/app/actions/notifications";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export function MarkAllReadButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleMarkAllRead = async () => {
        setIsLoading(true);
        try {
            await markAllAsReadAction();
            toast({
                description: "تم تحديث جميع الإشعارات كمقروءة",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                description: "حدث خطأ أثناء تحديث الإشعارات",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            className="gap-2"
            onClick={handleMarkAllRead}
            disabled={isLoading}
        >
            <CheckCheck className="w-4 h-4" />
            تحديد الكل كمقروء
        </Button>
    );
}
