import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { CheckCircle2, XCircle, FileText, MessageSquare, User } from "lucide-react";

interface Action {
    id: string;
    request_id: string;
    actor_id: string;
    action_type: string;
    comment?: string;
    created_at: string;
    actor?: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        created_at: string;
    };
}

interface EnhancedHistoryProps {
    actions: Action[];
}

const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
    'إنشاء': {
        icon: FileText,
        color: 'text-blue-600 bg-blue-50',
        label: 'تم إنشاء الطلب'
    },
    'اعتماد': {
        icon: CheckCircle2,
        color: 'text-green-600 bg-green-50',
        label: 'تمت الموافقة'
    },
    'رفض': {
        icon: XCircle,
        color: 'text-red-600 bg-red-50',
        label: 'تم الرفض'
    },
    'تعليق': {
        icon: MessageSquare,
        color: 'text-orange-600 bg-orange-50',
        label: 'تم إضافة تعليق'
    }
};

export function EnhancedHistory({ actions }: EnhancedHistoryProps) {
    if (actions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                لا يوجد سجل حركات بعد
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {actions.map((action, index) => {
                const config = actionConfig[action.action_type] || {
                    icon: User,
                    color: 'text-gray-600 bg-gray-50',
                    label: action.action_type
                };
                const Icon = config.icon;
                const isLast = index === actions.length - 1;

                return (
                    <div key={action.id} className="relative flex gap-4">
                        {/* Timeline Line */}
                        {!isLast && (
                            <div className="absolute right-5 top-12 bottom-0 w-0.5 bg-gray-200" />
                        )}

                        {/* Icon */}
                        <div className={`relative flex-shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-6">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">{config.label}</p>
                                        <p className="text-sm text-gray-600">
                                            بواسطة: {action.actor?.full_name || 'غير معروف'}
                                        </p>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(action.created_at), {
                                            addSuffix: true,
                                            locale: ar,
                                        })}
                                    </span>
                                </div>

                                {action.comment && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-sm text-gray-700 italic">"{action.comment}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
