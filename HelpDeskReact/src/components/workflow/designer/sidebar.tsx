
import { useEffect, useState } from 'react';
import { Node, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, GripVertical, X } from 'lucide-react';

interface SidebarProps {
    selectedNodeId: string | null;
    nodes: Node[];
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
}

export function Sidebar({ selectedNodeId, nodes, setNodes }: SidebarProps) {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    // We keep local state for inputs to avoid excessive re-renders on every keystroke, 
    // but for v1 direct update is fine if performance holds. 
    // Let's do direct update for simplicity.

    // Delete Handler
    const handleDelete = () => {
        if (!selectedNode) return;

        // Prevent deleting Start (or single End?)
        // Designer restrictions: 
        if (selectedNode.data.type === 'start') {
            alert("لا يمكن حذف عقدة البداية");
            return;
        }

        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    };

    const updateData = (key: string, value: any) => {
        setNodes((nds) =>
            nds.map((n) => {
                if (n.id === selectedNodeId) {
                    return { ...n, data: { ...n.data, [key]: value } };
                }
                return n;
            })
        );
    };

    if (!selectedNode) {
        return (
            <aside className="w-80 bg-white border-r border-gray-200 h-full p-6 text-center text-gray-500 shrink-0">
                <div className="mt-10">
                    <GripVertical className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>اختر عقدة للتعديل</p>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 bg-white border-r border-gray-200 h-full flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">خصائص العقدة</h3>
                <Button variant="ghost" size="sm" onClick={() => updateData('label', selectedNode.data.label)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Common: Label */}
                <div className="space-y-2">
                    <Label htmlFor="label">العنوان</Label>
                    <Input
                        id="label"
                        value={selectedNode.data.label || ''}
                        onChange={(e) => updateData('label', e.target.value)}
                    />
                </div>

                {/* Task Specific */}
                {(selectedNode.data.type === 'task') && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="role">الدور المسؤول (Role)</Label>
                            <select
                                id="role"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedNode.data.role || ''}
                                onChange={(e) => updateData('role', e.target.value)}
                            >
                                <option value="" disabled>اختر الدور</option>
                                <option value="employee">موظف (Employee)</option>
                                <option value="approver">مشرف (Approver)</option>
                                <option value="service_owner">مسؤول خدمة (Service Owner)</option>
                                <option value="admin">مدير النظام (Admin)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sla">المدة المتوقعة (ساعات)</Label>
                            <Input
                                id="sla"
                                type="number"
                                min="1"
                                value={selectedNode.data.sla_hours || ''}
                                onChange={(e) => updateData('sla_hours', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </>
                )}

                {/* Gateway Specific */}
                {(selectedNode.data.type === 'gateway') && (
                    <div className="space-y-2">
                        <Label htmlFor="gatewayType">نوع البوابة</Label>
                        <select
                            id="gatewayType"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedNode.data.label || ''}
                            onChange={(e) => updateData('label', e.target.value)}
                        >
                            <option value="" disabled>اختر النوع</option>
                            <option value="AND">توازي (AND) - الجميع يجب أن يوافق</option>
                            <option value="OR">اختياري (OR) - أي مسار يكفي</option>
                        </select>
                        <p className="text-xs text-gray-500">
                            AND: ينتظر اكتمال جميع المسارات المتفرعة.
                            OR: يكمل بمجرد انتهاء أول مسار.
                        </p>
                    </div>
                )}

                {/* End Specific */}
                {(selectedNode.data.type === 'end') && (
                    <div className="space-y-2">
                        <Label htmlFor="endStatus">حالة النهاية</Label>
                        <select
                            id="endStatus"
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedNode.data.label || ''}
                            onChange={(e) => updateData('label', e.target.value)}
                        >
                            <option value="" disabled>اختر الحالة</option>
                            <option value="مكتمل">مكتمل (Completed)</option>
                            <option value="مرفوض">مرفوض (Rejected)</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={handleDelete}
                    disabled={selectedNode.data.type === 'start'}
                >
                    <Trash2 className="w-4 h-4" />
                    حذف العقدة
                </Button>
            </div>
        </aside>
    );
}
