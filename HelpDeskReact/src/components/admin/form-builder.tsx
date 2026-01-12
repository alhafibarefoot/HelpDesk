"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus,
    Trash2,
    GripVertical,
    Type,
    Calendar,
    List,
    AlignLeft,
    Hash,
    Mail,
    FileText,
    ChevronDown,
    ChevronUp,
    Save,
    Eye
} from 'lucide-react';
import { FormSchema } from '@/types';

export interface FormField {
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    width?: 'full' | '1/2' | '1/3' | '2/3' | '1/4';
    placeholder?: string;
    helpText?: string;
}

interface FormBuilderProps {
    initialSchema?: any;
    onSave: (schema: any) => void;
}

const fieldTypes = [
    { value: 'text', label: 'نص قصير', icon: Type },
    { value: 'textarea', label: 'نص طويل', icon: AlignLeft },
    { value: 'date', label: 'تاريخ', icon: Calendar },
    { value: 'select', label: 'قائمة منسدلة', icon: List },
    { value: 'number', label: 'رقم', icon: Hash },
    { value: 'email', label: 'بريد إلكتروني', icon: Mail },
    { value: 'section', label: 'عنوان قسم', icon: FileText },
];

export function FormBuilder({ initialSchema, onSave }: FormBuilderProps) {
    const [fields, setFields] = useState<FormField[]>(initialSchema?.fields || []);
    const [showPreview, setShowPreview] = useState(false);
    const [expandedField, setExpandedField] = useState<number | null>(null);

    const addField = () => {
        const newField: FormField = {
            key: `field_${Date.now()}`,
            label: 'حقل جديد',
            type: 'text',
            required: false,
            options: [],
            width: 'full'
        };
        setFields([...fields, newField]);
        setExpandedField(fields.length);
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
        if (expandedField === index) setExpandedField(null);
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newFields = [...fields];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;
        [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
        setFields(newFields);
        setExpandedField(newIndex);
    };

    const handleSave = () => {
        onSave({ fields });
    };

    const renderFieldEditor = (field: FormField, index: number) => {
        const isExpanded = expandedField === index;
        const FieldIcon = fieldTypes.find(t => t.value === field.type)?.icon || Type;
        const isSection = field.type === 'section';

        return (
            <div
                key={index}
                className={`bg-white border-2 rounded-xl overflow-hidden transition-all ${isSection ? 'border-purple-200 bg-purple-50' : 'border-gray-200 hover:border-blue-300'
                    }`}
            >
                {/* Field Header */}
                <div
                    className={`flex items-center gap-3 p-4 cursor-pointer ${isSection ? 'bg-purple-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => setExpandedField(isExpanded ? null : index)}
                >
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <div className={`p-2 rounded-lg ${isSection ? 'bg-purple-200' : 'bg-blue-100'}`}>
                        <FieldIcon className={`w-4 h-4 ${isSection ? 'text-purple-700' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                        <p className={`font-semibold ${isSection ? 'text-purple-900 text-lg' : 'text-gray-900'}`}>
                            {field.label}
                        </p>
                        {!isSection && (
                            <p className="text-xs text-gray-500">
                                {fieldTypes.find(t => t.value === field.type)?.label}
                                {field.required && ' • مطلوب'}
                                {field.width && ` • عرض ${field.width}`}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                moveField(index, 'up');
                            }}
                            disabled={index === 0}
                        >
                            <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                moveField(index, 'down');
                            }}
                            disabled={index === fields.length - 1}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeField(index);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Field Details */}
                {isExpanded && (
                    <div className="p-6 space-y-4 border-t bg-white">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Field Label */}
                            <div className="space-y-2">
                                <Label>تسمية {isSection ? 'القسم' : 'الحقل'}</Label>
                                <Input
                                    value={field.label}
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    placeholder={isSection ? "مثال: البيانات الشخصية" : "مثال: الاسم الكامل"}
                                />
                            </div>

                            {/* Field Key - Only for non-sections */}
                            {!isSection && (
                                <div className="space-y-2">
                                    <Label>المعرّف (Key)</Label>
                                    <Input
                                        value={field.key}
                                        onChange={(e) => updateField(index, { key: e.target.value })}
                                        placeholder="مثال: full_name"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            )}

                            {/* Field Type */}
                            <div className="space-y-2">
                                <Label>نوع الحقل</Label>
                                <select
                                    value={field.type}
                                    onChange={(e) => updateField(index, { type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {fieldTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!isSection && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Width */}
                                    <div className="space-y-2">
                                        <Label>عرض الحقل</Label>
                                        <div className="flex gap-2">
                                            {[
                                                { val: 'full', label: 'كامل (100%)' },
                                                { val: '1/2', label: 'نصف (50%)' },
                                                { val: '1/3', label: 'ثلث (33%)' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => updateField(index, { width: opt.val as any })}
                                                    className={`flex-1 py-2 text-sm rounded-lg border ${(field.width || 'full') === opt.val
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Required */}
                                    <div className="space-y-2">
                                        <Label>إعدادات إضافية</Label>
                                        <div className="flex items-center gap-4 h-10">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">مطلوب</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Options for Select */}
                                {field.type === 'select' && (
                                    <div className="space-y-2">
                                        <Label>الخيارات (كل خيار في سطر)</Label>
                                        <Textarea
                                            value={field.options?.join('\n') || ''}
                                            onChange={(e) => updateField(index, {
                                                options: e.target.value.split('\n')
                                            })}
                                            onBlur={() => {
                                                const cleanedOptions = field.options?.filter(o => o.trim()) || [];
                                                updateField(index, { options: cleanedOptions });
                                            }}
                                            placeholder="خيار 1&#10;خيار 2&#10;خيار 3"
                                            className="min-h-[100px] font-mono text-sm"
                                        />
                                    </div>
                                )}

                                {/* Placeholder & Help Text */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>نص توضيحي (Placeholder)</Label>
                                        <Input
                                            value={field.placeholder || ''}
                                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                            placeholder="يظهر داخل الحقل"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>تلميح مساعدة (Tooltip)</Label>
                                        <Input
                                            value={field.helpText || ''}
                                            onChange={(e) => updateField(index, { helpText: e.target.value })}
                                            placeholder="يظهر عند التحويم"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">بناء النموذج</h2>
                    <p className="text-sm text-gray-600">صمم نموذجاً احترافياً باستخدام الأقسام وتخطيط الشبكة</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                        <Save className="w-4 h-4" />
                        حفظ النموذج
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Builder Panel */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                            <span className="font-semibold">💡 نصيحة:</span> استخدم "عنوان قسم" لتنظيم النموذج، واستخدم خيارات العرض (نصف/ثلث) لترتيب الحقول بجانب بعضها.
                        </p>
                    </div>

                    {/* Fields List */}
                    <div className="space-y-3">
                        {fields.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-3" />
                                <p className="text-gray-600 mb-4">لا توجد حقول بعد</p>
                                <Button onClick={addField} className="bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    إضافة أول حقل
                                </Button>
                            </div>
                        ) : (
                            <>
                                {fields.map((field, index) => renderFieldEditor(field, index))}
                                <Button
                                    onClick={addField}
                                    variant="outline"
                                    className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    إضافة حقل جديد
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className="lg:sticky lg:top-6 h-fit">
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">معاينة النموذج</h3>
                            {fields.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">أضف حقولاً لرؤية المعاينة</p>
                            ) : (
                                <div className="flex flex-wrap -mx-2">
                                    {fields.map((field, index) => {
                                        if (field.type === 'section') {
                                            return (
                                                <div key={index} className="w-full px-2 mt-6 mb-3 pb-2 border-b border-gray-200">
                                                    <h4 className="text-lg font-bold text-gray-800">{field.label}</h4>
                                                </div>
                                            );
                                        }

                                        const widthClass = field.width === '1/2' ? 'w-1/2' : field.width === '1/3' ? 'w-1/3' : 'w-full';

                                        return (
                                            <div key={index} className={`${widthClass} px-2 mb-4`}>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-1">
                                                        {field.label}
                                                        {field.required && <span className="text-red-500">*</span>}
                                                    </Label>
                                                    {field.type === 'textarea' ? (
                                                        <Textarea placeholder={field.placeholder} />
                                                    ) : field.type === 'select' ? (
                                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                                            <option value="">اختر...</option>
                                                            {field.options?.map((opt: any, i) => {
                                                                const label = typeof opt === 'object' ? opt.label : opt;
                                                                const value = typeof opt === 'object' ? opt.value : opt;
                                                                return <option key={i} value={value}>{label}</option>;
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <Input type={field.type} placeholder={field.placeholder} />
                                                    )}
                                                    {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
