import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { CheckCircle, Play, User, Clock, Zap, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const NodeWrapper = ({ children, selected, className }: { children: React.ReactNode; selected?: boolean; className?: string }) => (
    <div className={cn(
        "shadow-lg rounded-lg border-2 bg-white transition-all duration-200",
        selected ? "border-blue-500 ring-4 ring-blue-200" : "border-gray-300 hover:border-blue-400 hover:shadow-xl",
        className
    )}>
        {children}
    </div>
);

// 🟢 Start Node
export const StartNode = memo(({ data, selected }: NodeProps) => {
    return (
        <NodeWrapper selected={selected} className="min-w-[140px] border-green-400 bg-gradient-to-br from-green-50 to-green-100">
            <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-600 border-2 border-white" />
            <div className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-full shadow-md">
                    <Play size={18} fill="white" className="text-white" />
                </div>
                <div>
                    <div className="text-xs font-semibold text-green-700 uppercase">البداية</div>
                    <div className="font-bold text-gray-900">{data?.label || 'ابدأ'}</div>
                </div>
            </div>
        </NodeWrapper>
    );
});

// 🔴 End Node - Multiple Outcomes
export const EndNode = memo(({ data, selected }: NodeProps) => {
    const outcome = data?.outcome || 'completed';

    const outcomeStyles = {
        completed: { border: 'border-green-400', bg: 'from-green-50 to-green-100', icon: 'bg-green-500', text: 'text-green-700', emoji: '✓', label: 'مكتمل' },
        rejected: { border: 'border-red-400', bg: 'from-red-50 to-red-100', icon: 'bg-red-500', text: 'text-red-700', emoji: '✗', label: 'مرفوض' },
        cancelled: { border: 'border-orange-400', bg: 'from-orange-50 to-orange-100', icon: 'bg-orange-500', text: 'text-orange-700', emoji: '⊘', label: 'ملغي' },
        redirected: { border: 'border-blue-400', bg: 'from-blue-50 to-blue-100', icon: 'bg-blue-500', text: 'text-blue-700', emoji: '↪️', label: 'محول' },
        on_hold: { border: 'border-yellow-400', bg: 'from-yellow-50 to-yellow-100', icon: 'bg-yellow-500', text: 'text-yellow-700', emoji: '⏸️', label: 'معلق' },
        expired: { border: 'border-gray-400', bg: 'from-gray-50 to-gray-100', icon: 'bg-gray-500', text: 'text-gray-700', emoji: '⏱️', label: 'منتهي' }
    };

    const style = outcomeStyles[outcome as keyof typeof outcomeStyles] || outcomeStyles.completed;

    return (
        <NodeWrapper selected={selected} className={cn("min-w-[160px]", style.border, `bg-gradient-to-br ${style.bg}`)}>
            <Handle type="target" position={Position.Top} className={cn("w-3 h-3 border-2 border-white", style.icon)} />
            <div className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-full shadow-md", style.icon)}>
                    <span className="text-white text-lg">{style.emoji}</span>
                </div>
                <div>
                    <div className={cn("text-xs font-semibold uppercase", style.text)}>{style.label}</div>
                    <div className="font-bold text-gray-900">{data?.label || style.label}</div>
                    {data?.reason && <div className="text-xs text-gray-600 mt-1 italic">"{data.reason}"</div>}
                </div>
            </div>
        </NodeWrapper>
    );
});

// 🟦 Form Node
export const FormNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="min-w-[200px] border-sky-400 bg-gradient-to-br from-sky-50 to-sky-100">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-sky-600 border-2 border-white" />
        <div className="p-3 border-b border-sky-200 bg-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-700">
                <FileText size={16} />
                <span className="font-semibold text-sm">📝 إدخال بيانات</span>
            </div>
        </div>
        <div className="p-3">
            <div className="font-bold text-gray-900 mb-1">{data?.label || 'نموذج'}</div>
            {data?.fields && <div className="text-xs text-gray-500">{data.fields.length} حقل</div>}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-sky-600 border-2 border-white" />
    </NodeWrapper>
));

// 🟩 Approval Node
export const ApprovalNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="min-w-[200px] border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-600 border-2 border-white" />
        <div className="p-3 border-b border-emerald-200 bg-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle size={16} />
                <span className="font-semibold text-sm">✓ موافقة</span>
            </div>
            {data?.sla_hours && (
                <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded-full font-semibold">
                    <Clock size={12} />
                    <span>{data.sla_hours}س</span>
                </div>
            )}
        </div>
        <div className="p-3">
            <div className="font-bold text-gray-900 mb-2">{data?.label || 'موافقة'}</div>
            {data?.role && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    <User size={12} />
                    <span>{data.role}</span>
                </div>
            )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-600 border-2 border-white" />
    </NodeWrapper>
));

// 🟧 Action Node
export const ActionNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="min-w-[200px] border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-600 border-2 border-white" />
        <div className="p-3 border-b border-orange-200 bg-orange-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-700">
                <Zap size={16} />
                <span className="font-semibold text-sm">⚡ تنفيذ</span>
            </div>
            {data?.sla_hours && (
                <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-200 px-2 py-1 rounded-full font-semibold">
                    <Clock size={12} />
                    <span>{data.sla_hours}س</span>
                </div>
            )}
        </div>
        <div className="p-3">
            <div className="font-bold text-gray-900 mb-2">{data?.label || 'إجراء'}</div>
            {data?.role && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    <User size={12} />
                    <span>{data.role}</span>
                </div>
            )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-orange-600 border-2 border-white" />
    </NodeWrapper>
));

// 🟨 Gateway Node
export const GatewayNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="w-16 h-16 rotate-45 flex items-center justify-center border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 rounded-none shadow-lg">
        <Handle type="target" position={Position.Top} className="w-3 h-3 -mt-6 -ml-6 bg-amber-600 border-2 border-white" />
        <div className="-rotate-45">
            <div className="text-amber-700 font-bold text-sm text-center">{data?.label || 'AND'}</div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 -mb-6 -mr-6 bg-amber-600 border-2 border-white" />
    </NodeWrapper>
));

// ⬜ Join Node
export const JoinNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="w-16 h-16 rotate-45 flex items-center justify-center border-slate-500 bg-gradient-to-br from-slate-100 to-slate-200 rounded-none shadow-lg">
        <Handle type="target" position={Position.Top} className="w-3 h-3 -mt-6 -ml-6 bg-slate-700 border-2 border-white" />
        <div className="-rotate-45">
            <div className="text-slate-800 font-bold text-xs text-center">JOIN</div>
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 -mb-6 -mr-6 bg-slate-700 border-2 border-white" />
    </NodeWrapper>
));

// 🟪 Sub-Workflow Node
export const SubWorkflowNode = memo(({ data, selected }: NodeProps) => (
    <NodeWrapper selected={selected} className="min-w-[200px] border-[#93C5FD] bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE]">
        <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-600 border-2 border-white" />
        <div className="p-3 border-b border-purple-200 bg-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span className="font-semibold text-sm">📋 سير فرعي</span>
            </div>
        </div>
        <div className="p-3">
            <div className="font-bold text-gray-900 mb-1">{data?.label || 'Sub-Workflow'}</div>
            {data?.service_key && (
                <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded font-mono">
                    {data.service_key}
                </div>
            )}
        </div>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-600 border-2 border-white" />
    </NodeWrapper>
));

StartNode.displayName = 'StartNode';
EndNode.displayName = 'EndNode';
FormNode.displayName = 'FormNode';
ApprovalNode.displayName = 'ApprovalNode';
ActionNode.displayName = 'ActionNode';
GatewayNode.displayName = 'GatewayNode';
JoinNode.displayName = 'JoinNode';
SubWorkflowNode.displayName = 'SubWorkflowNode';
