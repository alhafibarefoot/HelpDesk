'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Plus, Trash, Zap } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ActionDef {
    id: string;
    workflow_id: string;
    node_id: string;
    trigger_type: string;
    action_type: string;
    config: any;
}

interface Props {
    workflowId: string;
    nodeId: string;
    nodeName: string; // Display name
}

export function WorkflowActionsManager({ workflowId, nodeId, nodeName }: Props) {
    const [actions, setActions] = useState<ActionDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [newTrigger, setNewTrigger] = useState('on_enter');
    const [newType, setNewType] = useState('set_field');
    const [configField, setConfigField] = useState('');
    const [configValue, setConfigValue] = useState('');

    const supabase = createClient();

    useEffect(() => {
        if (workflowId && nodeId) {
            fetchActions();
        }
    }, [workflowId, nodeId]);

    const fetchActions = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('workflow_actions')
            .select('*')
            .eq('workflow_id', workflowId)
            .eq('node_id', nodeId);

        setActions(data || []);
        setLoading(false);
    };

    const handleAdd = async () => {
        const config: any = {};
        if (newType === 'set_field') {
            config.field = configField;
            config.value = configValue;
        } else if (newType === 'send_email') {
            config.subject = configField; // Reusing state for simplicity
            config.body = configValue;
        }

        const { error } = await supabase.from('workflow_actions').insert({
            workflow_id: workflowId,
            node_id: nodeId,
            trigger_type: newTrigger,
            action_type: newType,
            config: config
        });

        if (!error) {
            fetchActions();
            setIsDialogOpen(false);
            // Reset form
            setConfigField('');
            setConfigValue('');
        } else {
            alert('Failed to add action');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await supabase.from('workflow_actions').delete().eq('id', id);
        fetchActions();
    };

    if (loading) return <div className="text-xs text-gray-400">Loading actions...</div>;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Automations ({actions.length})
                </h4>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                        <DialogHeader>
                            <DialogTitle>إضافة إجراء تلقائي لخطوة: {nodeName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>متى يتم التنفيذ؟ (Trigger)</Label>
                                <Select value={newTrigger} onValueChange={setNewTrigger}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="on_enter">عند الدخول للخطوة (On Enter)</SelectItem>
                                        <SelectItem value="on_approve">عند الاعتماد (On Approve)</SelectItem>
                                        <SelectItem value="on_reject">عند الرفض (On Reject)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>نوع الإجراء (Action Type)</Label>
                                <Select value={newType} onValueChange={setNewType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="set_field">تحديث حقل (Set Field)</SelectItem>
                                        <SelectItem value="send_email">إرسال بريد (Send Email)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newType === 'set_field' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>اسم الحقل (Key)</Label>
                                        <Input value={configField} onChange={e => setConfigField(e.target.value)} placeholder="priority" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>القيمة (Value)</Label>
                                        <Input value={configValue} onChange={e => setConfigValue(e.target.value)} placeholder="High" />
                                    </div>
                                </>
                            )}
                            {newType === 'send_email' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>العنوان (Subject)</Label>
                                        <Input value={configField} onChange={e => setConfigField(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>المحتوى (Body)</Label>
                                        <Input value={configValue} onChange={e => setConfigValue(e.target.value)} />
                                    </div>
                                </>
                            )}

                            <Button onClick={handleAdd} className="w-full mt-4">إضافة الإجراء</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-2">
                {actions.map(action => (
                    <div key={action.id} className="text-xs bg-slate-50 border p-2 rounded flex justify-between items-center">
                        <div>
                            <span className="font-semibold text-amber-700 block">{action.trigger_type}</span>
                            <span className="text-slate-600">{action.action_type}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-700" onClick={() => handleDelete(action.id)}>
                            <Trash className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
