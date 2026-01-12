import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ActivityItem {
    id: string;
    type: 'created' | 'approved' | 'rejected' | 'completed' | 'updated';
    title: string;
    description: string;
    timestamp: string;
    requestNumber?: string;
}

interface ActivityTimelineProps {
    activities: ActivityItem[];
    limit?: number;
}

const activityConfig = {
    created: {
        icon: Clock,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        label: 'تم الإنشاء'
    },
    approved: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'تمت الموافقة'
    },
    rejected: {
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
        label: 'تم الرفض'
    },
    completed: {
        icon: CheckCircle2,
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: 'مكتمل'
    },
    updated: {
        icon: AlertCircle,
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        label: 'تم التحديث'
    }
};

export function ActivityTimeline({ activities, limit = 10 }: ActivityTimelineProps) {
    const displayActivities = activities.slice(0, limit);

    if (displayActivities.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-500">لا توجد أنشطة حديثة</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">النشاط الأخير</h3>
            </div>
            <div className="p-6">
                <div className="space-y-4">
                    {displayActivities.map((activity, index) => {
                        const config = activityConfig[activity.type];
                        const Icon = config.icon;
                        const isLast = index === displayActivities.length - 1;

                        return (
                            <div key={activity.id} className="relative flex gap-4">
                                {/* Timeline line */}
                                {!isLast && (
                                    <div className="absolute right-4 top-10 bottom-0 w-0.5 bg-gray-200" />
                                )}

                                {/* Icon */}
                                <div className={`relative flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pb-4">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-medium text-gray-900">
                                            {activity.title}
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {activity.timestamp}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        {activity.description}
                                    </p>
                                    {activity.requestNumber && (
                                        <span className="inline-block text-xs text-blue-600 font-medium">
                                            {activity.requestNumber}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
