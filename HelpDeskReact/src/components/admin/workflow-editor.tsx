"use client"

import { useState } from "react";
import { WorkflowStep, UserRole, StepType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save, ArrowUp, ArrowDown } from "lucide-react";
import { saveWorkflow } from "@/app/actions";

interface WorkflowEditorProps {
  serviceId: string;
  serviceKey: string;
  initialSteps: WorkflowStep[];
}

export function WorkflowEditor({ serviceId, serviceKey, initialSteps }: WorkflowEditorProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);
  const [isSaving, setIsSaving] = useState(false);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `new-${Date.now()}`,
      workflow_id: `wf-${serviceId}`,
      step_order: steps.length + 1,
      name: "خطوة جديدة",
      step_type: "اعتماد",
      assigned_role: "موظف",
      requires_all_approvers: false,
      created_at: new Date().toISOString()
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, index) => ({ ...s, step_order: index + 1 })));
  };

  const updateStep = (id: string, field: keyof WorkflowStep, value: any) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) return;

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    // Update order
    newSteps.forEach((s, i) => s.step_order = i + 1);

    setSteps(newSteps);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert linear steps to Graph Definition (Nodes & Edges)
      const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

      const nodes: any[] = [];
      const edges: any[] = [];

      // 1. Start Node
      nodes.push({
        id: 'start',
        type: 'start', // Ensure this type exists in your nodeTypes
        position: { x: 250, y: 50 },
        data: { label: 'البداية' }
      });

      // 2. Step Nodes
      sortedSteps.forEach((step, index) => {
        let type = 'action';
        if (step.step_type === 'اعتماد') type = 'approval';

        nodes.push({
          id: step.id,
          type: type,
          position: { x: 250, y: 150 + (index * 100) }, // Vertical layout
          data: {
            label: step.name,
            role: step.assigned_role,
            sla_hours: step.sla_hours,
            // Map other legacy fields if needed
            ...step
          }
        });
      });

      // 3. End Node
      const endY = 150 + (sortedSteps.length * 100);
      nodes.push({
        id: 'end',
        type: 'end',
        position: { x: 250, y: endY },
        data: { label: 'النهاية' }
      });

      // 4. Edges
      // Start -> First Step
      if (sortedSteps.length > 0) {
        edges.push({
          id: 'e-start-first',
          source: 'start',
          target: sortedSteps[0].id
        });

        // Step -> Step
        for (let i = 0; i < sortedSteps.length - 1; i++) {
          edges.push({
            id: `e-${sortedSteps[i].id}-${sortedSteps[i + 1].id}`,
            source: sortedSteps[i].id,
            target: sortedSteps[i + 1].id
          });
        }

        // Last Step -> End
        edges.push({
          id: `e-last-end`,
          source: sortedSteps[sortedSteps.length - 1].id,
          target: 'end'
        });
      } else {
        // Direct Start -> End if no steps
        edges.push({
          id: 'e-start-end',
          source: 'start',
          target: 'end'
        });
      }

      const definition = {
        version: '1.0' as const,
        nodes,
        edges
      };

      const result = await saveWorkflow(serviceKey, definition);
      if (result.success) {
        alert("تم حفظ سير العمل بنجاح");
      } else {
        alert("حدث خطأ أثناء الحفظ");
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ غير متوقع");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">خطوات سير العمل</h2>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "جاري الحفظ..." : <><Save className="w-4 h-4 ml-2" /> حفظ التغييرات</>}
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="bg-white p-4 rounded-lg border shadow-sm flex gap-4 items-start">
            <div className="flex flex-col gap-2 mt-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(index, 'up')} disabled={index === 0}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <div className="text-center font-bold text-gray-400">{index + 1}</div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1}>
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">اسم الخطوة</label>
                <Input
                  value={step.name}
                  onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">الدور المسؤول</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={step.assigned_role || ''}
                  onChange={(e) => updateStep(step.id, 'assigned_role', e.target.value)}
                >
                  <option value="موظف">موظف</option>
                  <option value="مدير">مدير</option>
                  <option value="مشرف">مشرف</option>
                  <option value="مسؤول خدمة">مسؤول خدمة</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">نوع الخطوة</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={step.step_type}
                  onChange={(e) => updateStep(step.id, 'step_type', e.target.value)}
                >
                  <option value="اعتماد">اعتماد (موافقة/رفض)</option>
                  <option value="تنفيذ">تنفيذ (إنجاز مهمة)</option>
                  <option value="إشعار">إشعار فقط</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">وقت الإنجاز (SLA) بالساعات</label>
                <Input
                  type="number"
                  value={step.sla_hours || ''}
                  onChange={(e) => updateStep(step.id, 'sla_hours', parseInt(e.target.value))}
                  placeholder="مثال: 24"
                />
              </div>

              <div className="md:col-span-2 border-t pt-4 mt-2">
                <label className="text-sm font-medium mb-2 block">الشروط (اختياري)</label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="اسم الحقل (مثال: amount)"
                    value={(step.condition as any)?.field || ''}
                    onChange={(e) => updateStep(step.id, 'condition', { ...step.condition, field: e.target.value })}
                  />
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={(step.condition as any)?.operator || 'gt'}
                    onChange={(e) => updateStep(step.id, 'condition', { ...step.condition, operator: e.target.value })}
                  >
                    <option value="eq">يساوي (=)</option>
                    <option value="neq">لا يساوي (!=)</option>
                    <option value="gt">أكبر من (&gt;)</option>
                    <option value="lt">أصغر من (&lt;)</option>
                  </select>
                  <Input
                    placeholder="القيمة"
                    value={(step.condition as any)?.value || ''}
                    onChange={(e) => updateStep(step.id, 'condition', { ...step.condition, value: e.target.value })}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">اتركها فارغة إذا كانت الخطوة مطلوبة دائماً.</p>
              </div>
            </div>

            <Button variant="destructive" size="icon" onClick={() => removeStep(step.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
            لا توجد خطوات معرفة لهذا السير.
          </div>
        )}

        <Button variant="outline" onClick={addStep} className="w-full border-dashed">
          <Plus className="w-4 h-4 ml-2" /> إضافة خطوة جديدة
        </Button>
      </div>
    </div>
  );
}
