import React from 'react';
import { Node, Edge } from 'reactflow';
import { BarChart3, Clock, CheckCircle, Zap, FileText, GitBranch, TrendingUp } from 'lucide-react';
import { calculateWorkflowStats, getComplexityDisplay, getIntegrationsList, estimateCompletionTime } from '@/lib/workflow-analytics';
import { cn } from '@/lib/utils';

interface WorkflowSummaryProps {
    nodes: Node[];
    edges: Edge[];
    className?: string;
}

export function WorkflowSummary({ nodes, edges, className }: WorkflowSummaryProps) {
    const stats = calculateWorkflowStats(nodes, edges);
    const complexity = getComplexityDisplay(stats.complexityLevel);
    const integrations = getIntegrationsList(stats);
    const estimatedTime = estimateCompletionTime(stats);

    return (
        <div className={cn('bg-white border border-gray-200 rounded-lg shadow-sm', className)}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">📊 ملخص سير العمل</h3>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Steps Summary */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">الخطوات</h4>
                    <div className="grid grid-cols-2 gap-2">
                        <StatItem icon={<CheckCircle size={14} />} label="موافقات" value={stats.approvalSteps} color="text-emerald-600" />
                        <StatItem icon={<Zap size={14} />} label="إجراءات" value={stats.actionSteps} color="text-orange-600" />
                        <StatItem icon={<FileText size={14} />} label="نماذج" value={stats.formSteps} color="text-sky-600" />
                        <StatItem icon={<GitBranch size={14} />} label="بوابات" value={stats.gatewaySteps} color="text-amber-600" />
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">إجمالي الخطوات:</span>
                            <span className="font-bold text-gray-900">{stats.totalSteps}</span>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">الأداء</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock size={14} />
                                <span>الوقت المتوقع:</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{estimatedTime}</span>
                        </div>

                        {stats.stepsWithSLA > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">متوسط SLA:</span>
                                <span className="text-sm font-semibold text-gray-900">{Math.round(stats.averageSLA)} ساعة</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">نقاط النهاية:</span>
                            <span className="text-sm font-semibold text-gray-900">{stats.endStates}</span>
                        </div>
                    </div>
                </div>

                {/* Complexity */}
                <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">التعقيد</h4>
                    <div className={cn('p-3 rounded-lg', complexity.bg)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className={complexity.color} />
                                <span className={cn('text-sm font-semibold', complexity.color)}>
                                    {complexity.label}
                                </span>
                            </div>
                            <span className="text-lg">{complexity.emoji}</span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                            نقاط التعقيد: {stats.complexityScore}
                        </div>
                    </div>
                </div>

                {/* Integrations */}
                <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">الميزات</h4>
                    <div className="flex flex-wrap gap-2">
                        {integrations.map((integration, index) => (
                            <span
                                key={index}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                            >
                                {integration}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Warnings */}
                {(stats.totalSteps === 0 || stats.endStates === 0) && (
                    <div className="border-t border-gray-100 pt-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs text-yellow-800">
                                {stats.totalSteps === 0 && '⚠️ لم يتم إضافة خطوات بعد'}
                                {stats.totalSteps > 0 && stats.endStates === 0 && '⚠️ يجب إضافة نقطة نهاية واحدة على الأقل'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface StatItemProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}

function StatItem({ icon, label, value, color }: StatItemProps) {
    return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <div className={cn(color)}>{icon}</div>
            <div className="flex-1">
                <div className="text-xs text-gray-600">{label}</div>
                <div className="text-sm font-bold text-gray-900">{value}</div>
            </div>
        </div>
    );
}
