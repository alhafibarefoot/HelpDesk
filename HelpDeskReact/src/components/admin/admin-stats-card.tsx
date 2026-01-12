import { LucideIcon } from "lucide-react";

interface AdminStatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        label: string;
    };
    color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'indigo';
}

const colorClasses = {
    blue: {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'bg-blue-500'
    },
    green: {
        gradient: 'from-green-500 to-green-600',
        bg: 'bg-green-50',
        text: 'text-green-600',
        icon: 'bg-green-500'
    },
    orange: {
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        icon: 'bg-orange-500'
    },
    purple: {
        gradient: 'from-[#3B82F6] to-[#60A5FA]',
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#3B82F6]',
        icon: 'bg-[#3B82F6]'
    },
    red: {
        gradient: 'from-red-500 to-red-600',
        bg: 'bg-red-50',
        text: 'text-red-600',
        icon: 'bg-red-500'
    },
    indigo: {
        gradient: 'from-indigo-500 to-indigo-600',
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        icon: 'bg-indigo-500'
    }
};

export function AdminStatsCard({ title, value, icon: Icon, trend, color }: AdminStatsCardProps) {
    const colors = colorClasses[color];

    return (
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-200 p-6 transition-all hover:shadow-xl hover:scale-105">
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-5`} />

            {/* Content */}
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                        <p className={`text-4xl font-bold ${colors.text}`}>{value}</p>
                    </div>
                    <div className={`${colors.icon} p-3 rounded-xl`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                </div>

                {trend && (
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </span>
                        <span className="text-xs text-gray-500">{trend.label}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
