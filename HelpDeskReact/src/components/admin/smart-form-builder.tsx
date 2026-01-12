"use client";

import { useState, useEffect } from "react";
import { FormSchema, FormPage, FormSection, FieldDefinition, FieldType, WorkflowStep, StepFieldPermission } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Settings, Shield, Lock, Eye, AlertCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { getServiceWorkflowSteps } from "@/app/actions/workflow";
import { getStepFieldPermissions, setStepFieldPermissions } from "@/app/actions/permissions";
import { useToast } from "@/components/ui/use-toast";

interface Props {
    initialSchema?: FormSchema;
    onSave: (schema: FormSchema) => void;
    serviceId?: string; // Needed for permissions
}

const DEFAULT_SCHEMA: FormSchema = {
    version: "2.0",
    settings: { layout: "wizard" },
    pages: [
        {
            id: "page_1",
            title: "الصفحة الأولى",
            sections: [
                {
                    id: "sec_1",
                    title: "بيانات عامة",
                    columns: 1,
                    fields: []
                }
            ]
        }
    ]
};

export function SmartFormBuilder({ initialSchema, onSave, serviceId }: Props) {
    const [schema, setSchema] = useState<FormSchema>(initialSchema?.version === '2.0' ? initialSchema : DEFAULT_SCHEMA);
    const [activePageId, setActivePageId] = useState<string>(schema.pages[0]?.id || "");
    const [activeTab, setActiveTab] = useState("builder");
    const { toast } = useToast();

    // Permissions State
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [permissions, setPermissions] = useState<StepFieldPermission[]>([]);
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [activeRoleType, setActiveRoleType] = useState<'assignee' | 'requester' | 'others'>('assignee');

    // Fetch steps and permissions when switching to Permissions tab
    useEffect(() => {
        if (activeTab === "permissions" && serviceId) {
            loadPermissionsData();
        }
    }, [activeTab, serviceId]);

    const loadPermissionsData = async () => {
        if (!serviceId) return;
        setLoadingPerms(true);
        try {
            // 1. Get Steps
            const stepsData = await getServiceWorkflowSteps(serviceId);
            setSteps(stepsData);

            if (stepsData.length > 0) {
                // 2. Get Permissions for all steps (simplified: usually we might fetch per step, but for matrix view we need all)
                // Current server action gets per step. We'll fetch for all steps in parallel.
                // This might be heavy if many steps. For V1 it's fine.
                const allPerms: StepFieldPermission[] = [];
                await Promise.all(stepsData.map(async (step) => {
                    const stepPerms = await getStepFieldPermissions(step.id);
                    allPerms.push(...stepPerms);
                }));
                setPermissions(allPerms);
            }
        } catch (error) {
            console.error("Failed to load permissions", error);
            toast({ variant: "destructive", title: "خطأ", description: "فشل تحميل بيانات الصلاحيات" });
        } finally {
            setLoadingPerms(false);
        }
    };

    const handleSavePermissions = async () => {
        if (!serviceId || steps.length === 0) return;
        setLoadingPerms(true);
        try {
            // Group by step_id to save efficiently
            await Promise.all(steps.map(async (step) => {
                const stepPerms = permissions.filter(p => p.step_id === step.id);
                // Only save changed ones? For now save all for the step.
                // We need to map back to Partial<StepFieldPermission>
                const payload = stepPerms.map(p => ({
                    step_id: step.id,
                    field_key: p.field_key,
                    visible: p.visible,
                    editable: p.editable,
                    required_override: p.required_override,
                    allowed_roles: p.allowed_roles,
                    role_type: p.role_type || 'assignee'
                }));
                if (payload.length > 0) {
                    await setStepFieldPermissions(step.id, payload);
                }
            }));
            toast({ title: "تم الحفظ", description: "تم حفظ الصلاحيات بنجاح", className: "bg-green-600 text-white" });
        } catch (error) {
            console.error("Failed to save permissions", error);
            toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ الصلاحيات" });
        } finally {
            setLoadingPerms(false);
        }
    };

    const updatePermission = (stepId: string, fieldKey: string, key: keyof StepFieldPermission, value: any) => {
        setPermissions(prev => {
            const existingIdx = prev.findIndex(p => p.step_id === stepId && p.field_key === fieldKey && (p.role_type || 'assignee') === activeRoleType);
            if (existingIdx > -1) {
                const updated = [...prev];
                updated[existingIdx] = { ...updated[existingIdx], [key]: value };
                return updated;
            } else {
                // Create new permission entry if not exists (defaulting others to true)
                return [...prev, {
                    id: `temp_${Date.now()}`, // Temp ID
                    step_id: stepId,
                    field_key: fieldKey,
                    // IMPORTANT: Include workflow_id if available on step? 
                    // See handleSavePermissions: we filter by step.id. 
                    // But we need to ensure the permission object HAS a workflow_id.
                    // The 'steps' array has workflow_id. We should find it.
                    workflow_id: steps.find(s => s.id === stepId)?.workflow_id,
                    role_type: activeRoleType,
                    visible: true,
                    editable: activeRoleType === 'assignee', // Default: Requester ReadOnly? Let's say yes for safety.
                    required_override: null,
                    allowed_roles: null,
                    created_at: '',
                    updated_at: '',
                    [key]: value
                } as StepFieldPermission];
            }
        });
    };

    // Builder Logic (Same as before)
    const activePage = schema.pages.find(p => p.id === activePageId);

    const handleSave = () => {
        onSave(schema);
    };

    const updateSchema = (updater: (s: FormSchema) => void) => {
        const newSchema = { ...schema };
        newSchema.pages = JSON.parse(JSON.stringify(schema.pages));
        updater(newSchema);
        setSchema(newSchema);
    };

    // ... (rest of helper functions addPage, addSection, addField remain similar but inline)
    const addPage = () => updateSchema(s => {
        const id = `page_${Date.now()}`;
        s.pages.push({ id, title: `صفحة جديدة ${s.pages.length + 1}`, sections: [] });
        setActivePageId(id);
    });

    const addSection = (pageId: string) => updateSchema(s => {
        const page = s.pages.find(p => p.id === pageId);
        if (page) page.sections.push({ id: `sec_${Date.now()}`, title: "قسم جديد", columns: 1, fields: [] });
    });

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="flex flex-col gap-6 min-h-screen">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm w-full top-0 sticky z-10">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="builder">تصميم النموذج</TabsTrigger>
                    <TabsTrigger value="permissions" disabled={!serviceId}>صلاحيات الحقول</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                    {activeTab === "builder" ? (
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
                            <Save className="w-4 h-4 ml-2" />
                            حفظ التصميم
                        </Button>
                    ) : (
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSavePermissions} disabled={loadingPerms}>
                            <Save className="w-4 h-4 ml-2" />
                            حفظ الصلاحيات
                        </Button>
                    )}
                </div>
            </div>

            <TabsContent value="builder" className="flex gap-6 mt-0 flex-1">
                {/* Sidebar: Structure Nav */}
                <div className="w-64 flex-shrink-0 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex justify-between items-center">
                                هيكل النموذج
                                <Button size="sm" variant="ghost" onClick={addPage}><Plus className="w-4 h-4" /></Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                            {schema.pages.map(page => (
                                <div
                                    key={page.id}
                                    onClick={() => setActivePageId(page.id)}
                                    className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center hover:bg-gray-100 ${activePageId === page.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600'}`}
                                >
                                    <span>{page.title}</span>
                                    {schema.pages.length > 1 && (
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={(e) => {
                                            e.stopPropagation();
                                            updateSchema(s => s.pages = s.pages.filter(p => p.id !== page.id));
                                            if (activePageId === page.id) setActivePageId(schema.pages[0].id);
                                        }}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Main Area: Page Editor */}
                <div className="flex-1 space-y-6">
                    {activePage ? (
                        <div className="space-y-6">
                            {/* Page Settings */}
                            <Card>
                                <CardContent className="p-4 flex gap-4 items-end">
                                    <div className="space-y-2 flex-1">
                                        <Label>عنوان الصفحة</Label>
                                        <Input
                                            value={activePage.title}
                                            onChange={(e) => updateSchema(s => {
                                                const p = s.pages.find(pg => pg.id === activePageId);
                                                if (p) p.title = e.target.value;
                                            })}
                                        />
                                    </div>
                                    <Button onClick={() => addSection(activePage.id)} variant="outline">
                                        <Plus className="w-4 h-4 ml-2" /> إضافة قسم
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Sections List */}
                            {activePage.sections.map((section) => (
                                <SectionEditor
                                    key={section.id}
                                    section={section}
                                    onUpdate={(updater) => updateSchema(s => {
                                        const p = s.pages.find(pg => pg.id === activePageId);
                                        if (p) {
                                            const sIdx = p.sections.findIndex(sec => sec.id === section.id);
                                            if (sIdx !== -1) {
                                                const newSec = { ...p.sections[sIdx] };
                                                updater(newSec);
                                                p.sections[sIdx] = newSec;
                                            }
                                        }
                                    })}
                                    onDelete={() => updateSchema(s => {
                                        const p = s.pages.find(pg => pg.id === activePageId);
                                        if (p) p.sections = p.sections.filter(sec => sec.id !== section.id);
                                    })}
                                />
                            ))}

                            {activePage.sections.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed rounded-lg text-gray-400">
                                    لا توجد أقسام في هذه الصفحة. اضغط "إضافة قسم" للبدء.
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            اختر صفحة للتعديل
                        </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            جدول صلاحيات الحقول
                        </CardTitle>
                        <p className="text-sm text-gray-500">تحكم بظهور وقابلية تعديل الحقول في كل خطوة من خطوات سير العمل.</p>
                    </CardHeader>
                    <CardContent>
                        {loadingPerms ? (
                            <div className="text-center py-8">جاري تحميل البيانات...</div>
                        ) : steps.length === 0 ? (
                            <div className="text-center py-8 text-yellow-600 bg-yellow-50 rounded border border-yellow-200">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                لم يتم تعريف سير عمل لهذه الخدمة بعد. يرجى إنشاء سير عمل أولاً.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                                        {(['assignee', 'requester', 'others'] as const).map((type) => {
                                            // Check if this role has any "non-standard" config
                                            // Standard Assignee: Visible=True, Editable=True (mostly)
                                            // Standard Requester: Visible=True, Editable=False
                                            // Realistically, any record implies a decision was made, but let's check values.
                                            // For simplicity: If ANY permission record exists where visible=false OR editable changes from default.

                                            const hasChanges = permissions.some(p =>
                                                p.role_type === type &&
                                                (
                                                    p.visible === false ||
                                                    (type === 'assignee' && p.editable === false) ||
                                                    (type !== 'assignee' && p.editable === true) ||
                                                    p.required_override === true
                                                )
                                            );

                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setActiveRoleType(type)}
                                                    className={`
                                                        px-4 py-2 rounded-md text-sm font-medium transition-all relative flex items-center gap-2
                                                        ${activeRoleType === type ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}
                                                    `}
                                                >
                                                    {type === 'assignee' && '👮 المسؤول عن الخطوة'}
                                                    {type === 'requester' && '👤 مقدم الطلب'}
                                                    {type === 'others' && '👥 آخرون'}

                                                    {hasChanges && (
                                                        <span className="flex h-2 w-2 rounded-full bg-orange-500" title="يوجد تعديلات هنا" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {activeRoleType === 'assignee' && "يتحكم فيما يراه ويعدله الموظف المسؤول عن إنجاز الخطوة الحالية."}
                                        {activeRoleType === 'requester' && "يتحكم فيما يراه مقدم الطلب عند متابعة طلبه وهو في هذه الخطوة."}
                                        {activeRoleType === 'others' && "يتحكم فيما يراه الموظفون الآخرون الذين لديهم صلاحية مشاهدة الطلب."}
                                    </p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="p-3 text-right border font-bold min-w-[200px]">الحقل</th>
                                                {steps.map(step => (
                                                    <th key={step.id} className="p-3 text-center border font-semibold min-w-[140px]">
                                                        <div className="flex flex-col items-center">
                                                            <span>{step.name}</span>
                                                            <span className="text-xs font-normal text-gray-500">{step.step_type}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schema.pages.flatMap(p => p.sections.flatMap(s => s.fields)).map(field => (
                                                <tr key={field.id} className="hover:bg-gray-50 group">
                                                    <td className="p-3 border font-medium">
                                                        <div>{field.label}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{field.key}</div>
                                                    </td>
                                                    {steps.map(step => {
                                                        const perm = permissions.find(p =>
                                                            p.step_id === step.id &&
                                                            p.field_key === field.key &&
                                                            (p.role_type || 'assignee') === activeRoleType
                                                        );
                                                        const isVisible = perm ? perm.visible : true; // Default True
                                                        const isEditable = perm ? perm.editable : (activeRoleType === 'assignee'); // Assignee defaults to editable, Requester to readonly? Or simplify: Default True.
                                                        // Actually, default for 'requester' in 'approval' step should probably be ReadOnly?
                                                        // For now, let's keep simple defaults.

                                                        const isRequired = perm?.required_override === true;

                                                        return (
                                                            <td key={`${field.id}_${step.id}`} className="p-3 border text-center">
                                                                <div className="flex justify-center gap-3">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <Switch
                                                                            checked={isVisible}
                                                                            onCheckedChange={(c) => updatePermission(step.id, field.key, 'visible', c)}
                                                                            className="h-4 w-8"
                                                                            title="إظهار الحقل"
                                                                        />
                                                                        <span className={`text-[10px] ${isVisible ? 'text-green-600' : 'text-gray-400'}`}>
                                                                            {isVisible ? 'ظاهر' : 'مخفي'}
                                                                        </span>
                                                                    </div>

                                                                    {isVisible && (
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <Checkbox
                                                                                checked={isEditable}
                                                                                onCheckedChange={(c) => updatePermission(step.id, field.key, 'editable', c === true)}
                                                                                title="قابل للتعديل"
                                                                                disabled={!isVisible}
                                                                            />
                                                                            <span className={`text-[10px] ${isEditable ? 'text-blue-600' : 'text-gray-400'}`}>
                                                                                {isEditable ? 'تعديل' : 'قراءة'}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {isVisible && isEditable && activeRoleType === 'assignee' && (
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <Checkbox
                                                                                checked={isRequired}
                                                                                onCheckedChange={(c) => updatePermission(step.id, field.key, 'required_override', c === true ? true : null)}
                                                                                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                                                                title="إلزامية الحقل"
                                                                            />
                                                                            <span className={`text-[10px] ${isRequired ? 'text-red-600' : 'text-gray-400'}`}>
                                                                                إلزامي
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

// Sub-components SectionEditor and FieldEditor remain largely unchanged but included for completeness
function SectionEditor({ section, onUpdate, onDelete }: {
    section: FormSection,
    onUpdate: (updater: (s: FormSection) => void) => void,
    onDelete: () => void
}) {
    const [isOpen, setIsOpen] = useState(true);

    const updateField = (fieldId: string, updater: (f: FieldDefinition) => void) => {
        onUpdate(sec => {
            const fIdx = sec.fields.findIndex(f => f.id === fieldId);
            if (fIdx !== -1) {
                const newField = { ...sec.fields[fIdx] };
                updater(newField);
                sec.fields[fIdx] = newField;
            }
        });
    };

    const deleteField = (fieldId: string) => {
        onUpdate(sec => {
            sec.fields = sec.fields.filter(f => f.id !== fieldId);
        });
    };

    return (
        <Card className="border-l-4 border-l-blue-500">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="p-4 flex items-center justify-between border-b bg-gray-50">
                    <div className="flex items-center gap-4 flex-1">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm"><ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} /></Button>
                        </CollapsibleTrigger>
                        <Input
                            value={section.title || ''}
                            placeholder="عنوان القسم (اختياري)"
                            className="max-w-xs h-8 bg-transparent border-transparent hover:border-gray-300 focus:bg-white"
                            onChange={(e) => onUpdate(s => s.title = e.target.value)}
                        />
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>الأعمدة:</span>
                            <Select
                                value={section.columns.toString()}
                                onValueChange={(v) => onUpdate(s => s.columns = parseInt(v) as any)}
                            >
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={onDelete}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <CollapsibleContent className="p-4 space-y-4">
                    {section.fields.map((field) => (
                        <FieldEditor
                            key={field.id}
                            field={field}
                            onUpdate={(updater) => updateField(field.id, updater)}
                            onDelete={() => deleteField(field.id)}
                        />
                    ))}

                    <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => onUpdate(s => s.fields.push({
                            id: `f_${Date.now()}`,
                            key: `key_${Date.now()}`,
                            type: 'text_single',
                            label: 'وصف الحقل',
                            required: false,
                            width: 'full'
                        }))}
                    >
                        <Plus className="w-4 h-4 ml-2" /> إضافة حقل
                    </Button>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}

function FieldEditor({ field, onUpdate, onDelete }: {
    field: FieldDefinition,
    onUpdate: (updater: (f: FieldDefinition) => void) => void,
    onDelete: () => void
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border rounded-md bg-white hover:border-blue-300 group transition-all">
            <div className="flex items-start gap-4 p-3">
                <div className="grid grid-cols-12 gap-3 flex-1">
                    <div className="col-span-4">
                        <Label className="text-xs text-gray-500">العنوان (Label)</Label>
                        <Input
                            value={field.label}
                            onChange={(e) => onUpdate(f => f.label = e.target.value)}
                            className="h-8"
                        />
                    </div>
                    <div className="col-span-3">
                        <Label className="text-xs text-gray-500">المفتاح (DB Key)</Label>
                        <Input
                            value={field.key}
                            onChange={(e) => onUpdate(f => f.key = e.target.value)}
                            className="h-8 font-mono text-xs"
                        />
                    </div>
                    <div className="col-span-3">
                        <Label className="text-xs text-gray-500">النوع</Label>
                        <Select
                            value={field.type}
                            onValueChange={(v) => onUpdate(f => {
                                f.type = v as FieldType;
                                if ((v === 'choice_single' || v === 'choice_multi') && !f.config?.options) {
                                    f.config = { ...f.config, options: [{ label: "خيار 1", value: "option_1" }] };
                                }
                            })}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text_single">نص قصير</SelectItem>
                                <SelectItem value="text_multi">نص طويل</SelectItem>
                                <SelectItem value="number">رقم</SelectItem>
                                <SelectItem value="decimal">رقم عشري</SelectItem>
                                <SelectItem value="email">بريد إلكتروني</SelectItem>
                                <SelectItem value="date">تاريخ</SelectItem>
                                <SelectItem value="datetime">تاريخ ووقت</SelectItem>
                                <SelectItem value="choice_single">قائمة منسدلة (Select)</SelectItem>
                                <SelectItem value="choice_multi">اختيار متعدد (Checkbox)</SelectItem>
                                <SelectItem value="user_picker">اختيار مستخدم</SelectItem>
                                <SelectItem value="attachment">مرفق</SelectItem>
                                <SelectItem value="yes_no">نعم/لا</SelectItem>
                                <SelectItem value="section">فاصل (Section)</SelectItem>
                                <SelectItem value="label">تسمية (Label)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 flex items-end pb-1 gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <Settings className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={onDelete}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 border-t bg-gray-50 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">نص توضيحي (Placeholder)</Label>
                            <Input
                                value={field.placeholder || ''}
                                onChange={(e) => onUpdate(f => f.placeholder = e.target.value)}
                                className="h-8 bg-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">عرض الحقل (Width)</Label>
                            <Select
                                value={field.width || 'full'}
                                onValueChange={(v) => onUpdate(f => f.width = v as any)}
                            >
                                <SelectTrigger className="h-8 bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full">كامل العرض (100%)</SelectItem>
                                    <SelectItem value="1/2">نصف العرض (50%)</SelectItem>
                                    <SelectItem value="1/3">ثلث العرض (33%)</SelectItem>
                                    <SelectItem value="2/3">ثلثي العرض (66%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">مساعدة / وصف (Help Text)</Label>
                            <Input
                                value={field.description || ''}
                                onChange={(e) => onUpdate(f => f.description = e.target.value)}
                                className="h-8 bg-white"
                            />
                        </div>
                        <div className="col-span-2 flex items-center space-x-2 space-x-reverse">
                            <Switch
                                checked={field.required as boolean}
                                onCheckedChange={(c) => onUpdate(f => f.required = c)}
                                id={`req_expand_${field.id}`}
                            />
                            <Label htmlFor={`req_expand_${field.id}`}>هذا الحقل إلزامي (Required)</Label>
                        </div>
                    </div>

                    {(field.type === 'choice_single' || field.type === 'choice_multi') && (
                        <div className="space-y-2 border-t pt-2">
                            <Label className="text-sm font-semibold">الخيارات (Options)</Label>
                            <div className="space-y-2">
                                {field.config?.options?.map((opt: any, idx: number) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <Input
                                            value={opt.label}
                                            placeholder="Label"
                                            className="h-8 flex-1 bg-white"
                                            onChange={(e) => onUpdate(f => {
                                                if (f.config?.options) f.config.options[idx].label = e.target.value;
                                            })}
                                        />
                                        <Input
                                            value={opt.value}
                                            placeholder="Value"
                                            className="h-8 flex-1 bg-white font-mono text-xs"
                                            onChange={(e) => onUpdate(f => {
                                                if (f.config?.options) f.config.options[idx].value = e.target.value;
                                            })}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => onUpdate(f => {
                                                if (f.config?.options) f.config.options.splice(idx, 1);
                                            })}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => onUpdate(f => {
                                        if (!f.config) f.config = {};
                                        if (!f.config.options) f.config.options = [];
                                        f.config.options.push({ label: `خيار ${f.config.options.length + 1}`, value: `opt_${Date.now()}` });
                                    })}
                                >
                                    <Plus className="w-3 h-3 ml-2" /> إضافة خيار
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
