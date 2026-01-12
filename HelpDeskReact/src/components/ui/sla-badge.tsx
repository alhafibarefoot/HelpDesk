import React from 'react';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';
import { SLAStatus, getSLAStatusColor, formatTimeRemaining } from '@/lib/sla-calculator';
import { cn } from '@/lib/utils';

interface SLABadgeProps {
    status: SLAStatus;
    size?: 'sm' | 'md' | 'lg';
    showDetails?: boolean;
}

export function SLABadge({ status, size = 'md', showDetails = false }: SLABadgeProps) {
    const color = getSLAStatusColor(status);

    const colorClasses: Record<string, string> = {
        red: 'bg-red-100 text-red-700 border-red-300',
        orange: 'bg-orange-100 text-orange-700 border-orange-300',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        green: 'bg-green-100 text-green-700 border-green-300',
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2',
    };

    const iconSize = {
        sm: 12,
        md: 14,
        lg: 16,
    };

    const Icon = status.is_overdue ? AlertCircle : status.needs_warning ? AlertTriangle : Clock;

    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full border font-semibold',
            colorClasses[color],
            sizeClasses[size]
        )}>
            <Icon size={iconSize[size]} />
            <span>{formatTimeRemaining(status.remaining_hours)}</span>

            {showDetails && (
                <span className="text-xs opacity-75">
                    ({Math.floor(status.percentage_used)}%)
                </span>
            )}
        </div>
    );
}

interface SLAProgressBarProps {
    status: SLAStatus;
}

export function SLAProgressBar({ status }: SLAProgressBarProps) {
    const color = getSLAStatusColor(status);

    const barColors: Record<string, string> = {
        red: 'bg-red-500',
        orange: 'bg-orange-500',
        yellow: 'bg-yellow-500',
        green: 'bg-green-500',
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                    {status.is_overdue ? 'متأخر' : 'الوقت المستخدم'}
                </span>
                <span className="text-xs text-gray-500">
                    {Math.floor(status.percentage_used)}%
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                    className={cn('h-full transition-all duration-300', barColors[color])}
                    style={{ width: `${Math.min(100, status.percentage_used)}%` }}
                />
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">
                    {formatTimeRemaining(status.elapsed_hours)} مضى
                </span>
                <span className="text-xs text-gray-500">
                    {formatTimeRemaining(status.total_hours)} إجمالي
                </span>
            </div>
        </div>
    );
}
