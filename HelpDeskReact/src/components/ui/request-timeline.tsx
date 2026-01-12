import React from 'react';
import { Clock, User, CheckCircle, XCircle, MessageSquare, Paperclip, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatArabicRelativeTime, formatArabicFileSize } from '@/lib/i18n/arabic-formatter';

export interface TimelineEvent {
    id: string;
    event_type: string;
    event_title: string;
    event_description?: string;
    actor_name: string;
    actor_role?: string;
    changes?: {
        field: string;
        from: string;
        to: string;
    };
    metadata?: any;
    created_at: string;
}

interface RequestTimelineProps {
    events: TimelineEvent[];
    className?: string;
}

export function RequestTimeline({ events, className }: RequestTimelineProps) {
    return (
        <div className={cn('space-y-4', className)}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 سجل الأحداث</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                {/* Events */}
                <div className="space-y-6">
                    {events.map((event, index) => (
                        <TimelineEventItem
                            key={event.id}
                            event={event}
                            isFirst={index === 0}
                            isLast={index === events.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

interface TimelineEventItemProps {
    event: TimelineEvent;
    isFirst: boolean;
    isLast: boolean;
}

function TimelineEventItem({ event, isFirst, isLast }: TimelineEventItemProps) {
    const { icon, color } = getEventStyle(event.event_type);
    const Icon = icon;

    return (
        <div className="relative flex gap-4 items-start">
            {/* Icon */}
            <div className={cn(
                'relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white',
                color.border,
                isFirst && 'ring-4 ring-opacity-20',
                isFirst && color.ring
            )}>
                <Icon className={cn('w-4 h-4', color.icon)} />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
                <div className={cn(
                    'bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow',
                    color.borderLight
                )}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h4 className="font-semibold text-gray-900">{event.event_title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.event_description}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap mr-2">
                            {formatArabicRelativeTime(event.created_at)}
                        </span>
                    </div>

                    {/* Actor */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{event.actor_name}</span>
                        {event.actor_role && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {event.actor_role}
                            </span>
                        )}
                    </div>

                    {/* Changes */}
                    {event.changes && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">{event.changes.field}:</span>
                                <span className="line-through text-gray-400">{event.changes.from}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-medium text-gray-900">{event.changes.to}</span>
                            </div>
                        </div>
                    )}

                    {/* Metadata (comments, attachments, etc.) */}
                    {event.metadata && renderMetadata(event.event_type, event.metadata)}
                </div>
            </div>
        </div>
    );
}

function getEventStyle(eventType: string) {
    const styles = {
        created: {
            icon: Clock,
            color: {
                icon: 'text-blue-600',
                border: 'border-blue-300',
                borderLight: 'border-blue-100',
                ring: 'ring-blue-200',
            },
        },
        status_changed: {
            icon: TrendingUp,
            color: {
                icon: 'text-purple-600',
                border: 'border-purple-300',
                borderLight: 'border-purple-100',
                ring: 'ring-purple-200',
            },
        },
        approved: {
            icon: CheckCircle,
            color: {
                icon: 'text-green-600',
                border: 'border-green-300',
                borderLight: 'border-green-100',
                ring: 'ring-green-200',
            },
        },
        rejected: {
            icon: XCircle,
            color: {
                icon: 'text-red-600',
                border: 'border-red-300',
                borderLight: 'border-red-100',
                ring: 'ring-red-200',
            },
        },
        commented: {
            icon: MessageSquare,
            color: {
                icon: 'text-indigo-600',
                border: 'border-indigo-300',
                borderLight: 'border-indigo-100',
                ring: 'ring-indigo-200',
            },
        },
        attachment_added: {
            icon: Paperclip,
            color: {
                icon: 'text-gray-600',
                border: 'border-gray-300',
                borderLight: 'border-gray-100',
                ring: 'ring-gray-200',
            },
        },
        escalated: {
            icon: AlertTriangle,
            color: {
                icon: 'text-orange-600',
                border: 'border-orange-300',
                borderLight: 'border-orange-100',
                ring: 'ring-orange-200',
            },
        },
        sla_warning: {
            icon: AlertTriangle,
            color: {
                icon: 'text-yellow-600',
                border: 'border-yellow-300',
                borderLight: 'border-yellow-100',
                ring: 'ring-yellow-200',
            },
        },
    };

    return styles[eventType as keyof typeof styles] || styles.status_changed;
}

function renderMetadata(eventType: string, metadata: any) {
    if (eventType === 'commented' && metadata.comment) {
        return (
            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded text-sm">
                <p className="text-gray-700 italic">"{metadata.comment}"</p>
            </div>
        );
    }

    if (eventType === 'attachment_added' && metadata.filename) {
        return (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Paperclip className="w-4 h-4" />
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {metadata.filename}
                </span>
                {metadata.size && (
                    <span className="text-xs text-gray-400">
                        ({formatArabicFileSize(metadata.size)})
                    </span>
                )}
            </div>
        );
    }

    return null;
}
