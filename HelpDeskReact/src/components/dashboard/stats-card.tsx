import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-50',
        icon: 'bg-blue-500',
        text: 'text-blue-600',
        border: 'border-blue-200'
    },
    green: {
        bg: 'bg-green-50',
        icon: 'bg-green-500',
        text: 'text-green-600',
        border: 'border-green-200'
    },
    orange: {
        bg: 'bg-orange-50',
        icon: 'bg-orange-500',
        text: 'text-orange-600',
        border: 'border-orange-200'
    },
    purple: {
        bg: 'bg-purple-50',
        icon: 'bg-purple-500',
        text: 'text-purple-600',
        border: 'border-purple-200'
    },
    red: {
        bg: 'bg-red-50',
        icon: 'bg-red-500',
        text: 'text-red-600',
        border: 'border-red-200'
    }
};

export function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
    const colors = colorClasses[color];

    return (
        <div className={`${colors.bg} border ${colors.border} rounded-xl p-6 transition-all hover:shadow-lg hover:scale-105`}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
                    {trend && (
                        <div className="flex items-center gap-1 mt-2">
                            <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-xs text-gray-500">من الشهر الماضي</span>
                        </div>
                    )}
                </div>
                <div className={`${colors.icon} p-4 rounded-xl`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    );
}
