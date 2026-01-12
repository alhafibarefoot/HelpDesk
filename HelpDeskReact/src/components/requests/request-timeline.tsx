
import { createClient } from "@/lib/supabase-server";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle2, XCircle, ArrowLeftCircle, PlayCircle, Clock } from "lucide-react";

interface RequestTimelineProps {
    requestId: string;
}

export async function RequestTimeline({ requestId }: RequestTimelineProps) {
    const supabase = await createClient();

    // Fetch actions with actor details
    const { data: actions, error } = await supabase
        .from('request_actions')
        .select(`
            *,
            actor:users(full_name, role)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching timeline:", error);
        return <div className="text-red-500 text-sm">تعذر تحميل سجل النشاطات.</div>
    }

    if (!actions || actions.length === 0) {
        return <div className="text-gray-500 text-sm p-4 text-center">لا يوجد نشاطات مسجلة حتى الآن.</div>
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'اعتماد':
            case 'approve': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'رفض':
            case 'reject': return <XCircle className="w-5 h-5 text-red-600" />;
            case 'إعادة':
            case 'send_back': return <ArrowLeftCircle className="w-5 h-5 text-yellow-600" />;
            case 'بدء':
            case 'start': return <PlayCircle className="w-5 h-5 text-blue-600" />;
            default: return <Clock className="w-5 h-5 text-gray-400" />;
        }
    };

    const getActionLabel = (type: string) => {
        switch (type) {
            case 'approve': return 'تم الاعتماد';
            case 'reject': return 'تم الرفض';
            case 'send_back': return 'تمت الإعادة';
            default: return type;
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Thread Line */}
            <div className="absolute top-0 bottom-0 right-[19px] w-0.5 bg-gray-200 -z-10" />

            {actions.map((action) => (
                <div key={action.id} className="flex gap-4 relative">
                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10">
                        {getIcon(action.action_type)}
                    </div>
                    <div className="flex-1 bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-gray-900">
                                {(action.actor as any)?.full_name || 'النظام'}
                            </p>
                            <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(action.created_at), { addSuffix: true, locale: ar })}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 font-medium mb-1">
                            {getActionLabel(action.action_type)}
                        </p>
                        {action.comment && (
                            <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                                "{action.comment}"
                            </div>
                        )}
                        <div className="mt-1 text-xs text-gray-400 flex gap-2">
                            <span>من: {action.from_step_id || 'البداية'}</span>
                            <span>إلى: {action.to_step_id || 'النهاية'}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
