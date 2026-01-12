import React, { useEffect, useState } from 'react';
import { Node, Edge } from 'reactflow';
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

interface PropertiesPanelProps {
    element: Node | Edge | null;
    onUpdate: (id: string, data: any, type: 'node' | 'edge') => void;
    onDelete: (id: string, type: 'node' | 'edge') => void;
    onClose?: () => void;
    formSchema?: any;
}

export function PropertiesPanel({ element, onUpdate, onDelete, onClose, formSchema }: PropertiesPanelProps) {
    const [label, setLabel] = useState('');
    const [role, setRole] = useState('');
    const [sla, setSla] = useState('');
    const [serviceKey, setServiceKey] = useState('');

    // Edge specific
    const [conditionField, setConditionField] = useState('');
    const [conditionOperator, setConditionOperator] = useState('');
    const [conditionValue, setConditionValue] = useState('');

    const isNode = element && 'position' in element;

    useEffect(() => {
        if (element) {
            setLabel(element.data?.label || '');

            if (isNode) {
                const node = element as Node;
                setRole(node.data?.role || '');
                setSla(node.data?.sla_hours || '');
                setServiceKey(node.data?.service_key || '');
            } else {
                const edge = element as Edge;
                const condition = edge.data?.condition;
                setConditionField(condition?.field || '');
                setConditionOperator(condition?.operator || '');
                setConditionValue(condition?.value || '');
            }
        }
    }, [element, isNode]);

    const handleChange = (field: string, value: any) => {
        if (!element) return;

        const newData = { ...element.data };

        if (isNode) {
            newData[field] = value;
        } else {
            if (field === 'label') {
                newData.label = value;
            } else {
                const newCondition = {
                    field: field === 'conditionField' ? value : conditionField,
                    operator: field === 'conditionOperator' ? value : conditionOperator,
                    value: field === 'conditionValue' ? value : conditionValue
                };
                if (newCondition.field) {
                    newData.condition = newCondition;
                }
            }
        }

        onUpdate(element.id, newData, isNode ? 'node' : 'edge');
    };

    if (!element) return null;

    const nodeType = isNode ? (element as Node).type : null;

    return (
        <div className="absolute top-4 left-4 w-80 bg-white shadow-xl rounded-lg border border-gray-200 flex flex-col overflow-hidden z-50">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-semibold text-gray-900">
                    {isNode ? 'خصائص الخطوة' : 'خصائص الرابط'}
                </h3>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X size={14} />
                    </Button>
                )}
            </div>

            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Common: Label */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">العنوان / التسمية</label>
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value);
                            handleChange('label', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>

                {isNode && (
                    <>
                        {/* Show Role & SLA only for Approval and Action nodes */}
                        {(nodeType === 'approval' || nodeType === 'action') && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">الدور المسؤول</label>
                                    <select
                                        value={role}
                                        onChange={(e) => {
                                            setRole(e.target.value);
                                            handleChange('role', e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="">اختر الدور...</option>
                                        <optgroup label="التسلسل الإداري">
                                            <option value="DIRECT_MANAGER">المدير المباشر (رئيس قسم)</option>
                                            <option value="MANAGER_LEVEL_2">مدير المدير (مدير إدارة)</option>
                                            <option value="MANAGER_LEVEL_3">مدير المستوى 3 (أمين عام مساعد)</option>
                                            <option value="MANAGER_LEVEL_4">مدير المستوى 4 (أمين عام)</option>
                                        </optgroup>
                                        <optgroup label="أدوار وظيفية">
                                            <option value="موظف">موظف</option>
                                            <option value="مدير">مدير</option>
                                            <option value="مشرف">مشرف</option>
                                            <option value="HR">HR (موارد بشرية)</option>
                                            <option value="مالية">مالية</option>
                                            <option value="IT">تقنية معلومات</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        ⏱️ وقت الإنجاز (SLA) بالساعات
                                    </label>
                                    <input
                                        type="number"
                                        value={sla}
                                        onChange={(e) => {
                                            setSla(e.target.value);
                                            handleChange('sla_hours', Number(e.target.value));
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="24"
                                        min="1"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        المدة المتوقعة لإنجاز هذه الخطوة
                                    </p>
                                </div>

                                {/* SLA Warning Threshold */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        ⚠️ تنبيه عند (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={(element as Node).data?.sla_warning_threshold || 80}
                                        onChange={(e) => handleChange('sla_warning_threshold', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="80"
                                        min="1"
                                        max="100"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        إرسال تنبيه عند الوصول لهذه النسبة من الوقت
                                    </p>
                                </div>

                                {/* Escalation Time */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">
                                        🔔 التصعيد بعد (ساعات)
                                    </label>
                                    <input
                                        type="number"
                                        value={(element as Node).data?.escalation_hours || ''}
                                        onChange={(e) => handleChange('escalation_hours', Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="اختياري"
                                        min="1"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        تصعيد تلقائي للمدير إذا تجاوز هذا الوقت
                                    </p>
                                </div>

                                {/* Business Hours Only */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="business-hours"
                                        checked={(element as Node).data?.business_hours_only || false}
                                        onChange={(e) => handleChange('business_hours_only', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="business-hours" className="text-sm text-gray-700">
                                        احتساب ساعات العمل فقط (8 صباحاً - 5 مساءً)
                                    </label>
                                </div>

                                {/* Error Handling Section */}
                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">⚠️ معالجة الأخطاء</h4>

                                    {/* Enable Retry */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="retry-enabled"
                                            checked={(element as Node).data?.retry_enabled !== false}
                                            onChange={(e) => handleChange('retry_enabled', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                        />
                                        <label htmlFor="retry-enabled" className="text-sm text-gray-700 font-medium">
                                            🔄 إعادة المحاولة عند الفشل
                                        </label>
                                    </div>

                                    {(element as Node).data?.retry_enabled !== false && (
                                        <>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">عدد المحاولات</label>
                                                    <input
                                                        type="number"
                                                        value={(element as Node).data?.max_retries || 3}
                                                        onChange={(e) => handleChange('max_retries', Number(e.target.value))}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        min="1"
                                                        max="5"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">التأخير (ثانية)</label>
                                                    <input
                                                        type="number"
                                                        value={(element as Node).data?.retry_delay || 30}
                                                        onChange={(e) => handleChange('retry_delay', Number(e.target.value))}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        min="10"
                                                        max="300"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Fallback Path */}
                                    <div className="flex items-center gap-2 mt-3">
                                        <input
                                            type="checkbox"
                                            id="fallback-enabled"
                                            checked={(element as Node).data?.fallback_enabled || false}
                                            onChange={(e) => handleChange('fallback_enabled', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                        />
                                        <label htmlFor="fallback-enabled" className="text-sm text-gray-700 font-medium">
                                            ↪️ مسار بديل عند الفشل
                                        </label>
                                    </div>

                                    {/* Notify Admin */}
                                    <div className="flex items-center gap-2 mt-2">
                                        <input
                                            type="checkbox"
                                            id="notify-on-error"
                                            checked={(element as Node).data?.notify_on_error !== false}
                                            onChange={(e) => handleChange('notify_on_error', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                                        />
                                        <label htmlFor="notify-on-error" className="text-sm text-gray-700">
                                            🔔 إشعار المسؤول عند الخطأ
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Show Service Key only for Sub-Workflow nodes */}
                        {nodeType === 'subworkflow' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">مفتاح الخدمة (Service Key)</label>
                                <input
                                    type="text"
                                    value={serviceKey}
                                    onChange={(e) => {
                                        setServiceKey(e.target.value);
                                        handleChange('service_key', e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="مثال: security-approval"
                                />
                                <p className="text-xs text-gray-400 mt-1">مفتاح الخدمة الفرعية المراد استدعاؤها</p>
                            </div>
                        )}

                        {/* Field Permissions Section (Only for Approval/Action nodes) */}
                        {(nodeType === 'approval' || nodeType === 'action') && formSchema && (
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">🛡️ صلاحيات الحقول</h4>
                                <div className="space-y-2">
                                    {formSchema.pages?.flatMap((p: any) => p.sections?.flatMap((s: any) => s.fields)).map((field: any) => {
                                        if (!field) return null;

                                        // Load existing permissions or default
                                        const perms = (element as Node).data?.field_permissions?.[field.key] || {
                                            visible: true,
                                            editable: false, // Default to read-only for approvals
                                            required: false
                                        };

                                        const updatePerm = (key: string, val: boolean) => {
                                            const currentPerms = (element as Node).data?.field_permissions || {};
                                            const updated = {
                                                ...currentPerms,
                                                [field.key]: { ...perms, [key]: val }
                                            };
                                            handleChange('field_permissions', updated);
                                        };

                                        return (
                                            <div key={field.key} className="bg-gray-50 p-2 rounded text-xs border border-gray-200">
                                                <div className="font-medium text-gray-700 mb-1 flex items-center justify-between">
                                                    <span>{field.label}</span>
                                                    <span className="text-gray-400 font-mono text-[10px]">{field.key}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 w-3 h-3"
                                                            checked={perms.visible}
                                                            onChange={(e) => updatePerm('visible', e.target.checked)}
                                                        />
                                                        <span>ظهور</span>
                                                    </label>

                                                    {perms.visible && (
                                                        <>
                                                            <label className="flex items-center gap-1 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="rounded border-gray-300 w-3 h-3"
                                                                    checked={perms.editable}
                                                                    onChange={(e) => updatePerm('editable', e.target.checked)}
                                                                />
                                                                <span>تعديل</span>
                                                            </label>

                                                            {perms.editable && (
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="rounded border-gray-300 w-3 h-3"
                                                                        checked={perms.required}
                                                                        onChange={(e) => updatePerm('required', e.target.checked)}
                                                                    />
                                                                    <span>إجباري</span>
                                                                </label>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Info for Gateway nodes */}
                        {nodeType === 'gateway' && (
                            <div className="bg-orange-50 p-3 rounded-md">
                                <p className="text-xs text-orange-800">
                                    <strong>البوابة:</strong> {label === 'AND' ? 'يجب إكمال جميع المسارات' : 'يكفي إكمال أي مسار'}
                                </p>
                            </div>
                        )}

                        {/* Info for Join nodes */}
                        {nodeType === 'join' && (
                            <div className="bg-slate-50 p-3 rounded-md">
                                <p className="text-xs text-slate-800">
                                    <strong>التجميع:</strong> يدمج المسارات المتوازية مرة أخرى
                                </p>
                            </div>
                        )}

                        {/* Outcome selector for End nodes */}
                        {nodeType === 'end' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">نوع النهاية</label>
                                    <select
                                        value={(element as Node).data?.outcome || 'completed'}
                                        onChange={(e) => handleChange('outcome', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="completed">✓ مكتمل</option>
                                        <option value="rejected">✗ مرفوض</option>
                                        <option value="cancelled">⊘ ملغي</option>
                                        <option value="redirected">↪️ محول</option>
                                        <option value="on_hold">⏸️ معلق</option>
                                        <option value="expired">⏱️ منتهي</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">السبب (اختياري)</label>
                                    <input
                                        type="text"
                                        value={(element as Node).data?.reason || ''}
                                        onChange={(e) => handleChange('reason', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="مثال: لم يستوفِ الشروط"
                                    />
                                </div>
                            </>
                        )}

                        {/* Info for Start nodes */}
                        {nodeType === 'start' && (
                            <div className="bg-blue-50 p-3 rounded-md">
                                <p className="text-xs text-blue-800">
                                    🟢 نقطة بداية الـ workflow
                                </p>
                            </div>
                        )}
                    </>
                )}

                {!isNode && (
                    <>
                        {/* Edge Conditions */}
                        <div className="border-t pt-4">
                            <h4 className="font-medium text-sm text-gray-700 mb-3">شرط الانتقال (اختياري)</h4>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">الحقل</label>
                                <input
                                    type="text"
                                    value={conditionField}
                                    onChange={(e) => {
                                        setConditionField(e.target.value);
                                        handleChange('conditionField', e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="مثال: action, amount"
                                />
                            </div>

                            <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">المعامل</label>
                                <select
                                    value={conditionOperator}
                                    onChange={(e) => {
                                        setConditionOperator(e.target.value);
                                        handleChange('conditionOperator', e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                    <option value="">اختر...</option>
                                    <option value="eq">يساوي (=)</option>
                                    <option value="neq">لا يساوي (≠)</option>
                                    <option value="gt">أكبر من (&gt;)</option>
                                    <option value="lt">أصغر من (&lt;)</option>
                                </select>
                            </div>

                            <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-500 mb-1">القيمة</label>
                                <input
                                    type="text"
                                    value={conditionValue}
                                    onChange={(e) => {
                                        setConditionValue(e.target.value);
                                        handleChange('conditionValue', e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="مثال: approve, 1000"
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 border-t bg-gray-50">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(element.id, isNode ? 'node' : 'edge')}
                    className="w-full"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    حذف الخطوة
                </Button>
            </div>
        </div>
    );
}
