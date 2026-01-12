import { useState, useEffect } from "react";
import { useForm, FormProvider, useFormContext, Controller } from "react-hook-form";
import { CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Upload, Paperclip, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormSchema, FormSection, FieldDefinition } from "@/types";
import { fetchLookupOptions } from "@/app/actions/lookup";

interface Props {
    schema: FormSchema;
    onSubmit: (data: any) => Promise<void>;
    defaultValues?: any;
    isSubmitting?: boolean;
}

export function SmartFormRenderer({ schema, onSubmit, defaultValues = {}, isSubmitting = false }: Props) {
    const methods = useForm({
        defaultValues,
        mode: "onChange"
    });

    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const pages = schema.pages || [];
    const currentPage = pages[currentPageIndex];
    const isLastPage = currentPageIndex === pages.length - 1;

    const handleNext = async () => {
        const isValid = await methods.trigger(); // Validate current step
        if (isValid) {
            setCurrentPageIndex(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setCurrentPageIndex(prev => Math.max(0, prev - 1));
    };

    const handleFormSubmit = async (data: any) => {
        await onSubmit(data);
    };

    if (!currentPage) return <div>Invalid Form Schema</div>;

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleFormSubmit)} className="space-y-8" dir="rtl">

                {/* Progress Bar (if wizard) */}
                {pages.length > 1 && (
                    <div className="flex items-center justify-center mb-8">
                        {pages.map((p, idx) => (
                            <div key={p.id} className="flex items-center">
                                <div className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold text-sm transition-colors",
                                    currentPageIndex === idx ? "border-blue-600 bg-blue-600 text-white" :
                                        currentPageIndex > idx ? "border-green-500 bg-green-500 text-white" : "border-gray-300 text-gray-400"
                                )}>
                                    {currentPageIndex > idx ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                                </div>
                                <span className={cn(
                                    "mx-2 text-sm font-medium hidden md:inline-block",
                                    currentPageIndex === idx ? "text-blue-900" : "text-gray-500"
                                )}>
                                    {p.title}
                                </span>
                                {idx < pages.length - 1 && <div className="w-8 md:w-12 h-0.5 bg-gray-200 mx-2" />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Page Content */}
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300" key={currentPage.id}>
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{currentPage.title}</h2>
                        {currentPage.description && <p className="text-gray-500">{currentPage.description}</p>}
                    </div>

                    {currentPage.sections.map(section => (
                        <FormSectionRenderer key={section.id} section={section} />
                    ))}
                </div>

                {/* Navigation Actions */}
                <div className="flex justify-between pt-6 border-t mt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentPageIndex === 0 || isSubmitting}
                        className={cn(currentPageIndex === 0 && "invisible")}
                    >
                        <ChevronRight className="ml-2 h-4 w-4" />
                        السابق
                    </Button>

                    {isLastPage ? (
                        <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                            {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
                            {!isSubmitting && <CheckCircle className="mr-2 h-4 w-4" />}
                        </Button>
                    ) : (
                        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                            التالي
                            <ChevronLeft className="mr-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

            </form>
        </FormProvider>
    );
}

function FormSectionRenderer({ section }: { section: FormSection }) {
    const gridCols = {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-4",
    };

    return (
        <Card className="border-gray-200 shadow-sm">
            {(section.title || section.description) && (
                <CardHeader className="pb-4">
                    {section.title && <CardTitle className="text-lg">{section.title}</CardTitle>}
                    {section.description && <p className="text-sm text-gray-500">{section.description}</p>}
                </CardHeader>
            )}
            <CardContent className={cn("grid gap-6", gridCols[section.columns])}>
                {section.fields.map((field, index) => (
                    <FormFieldRenderer key={field.key || `f-${index}`} field={field} />
                ))}
            </CardContent>
        </Card>
    );
}

function FormFieldRenderer({ field }: { field: FieldDefinition }) {
    const { watch, formState: { errors } } = useFormContext();
    const error = errors[field.key]?.message as string | undefined;
    const formValues = watch();

    // 1. Evaluate Logic Rules (Visibility)
    let isVisible = true;

    // Check 'hidden' property (static or boolean from permissions adapter)
    if (field.hidden === true) isVisible = false;

    // Check dynamic rules
    if (field.rules) {
        const visibilityRule = field.rules.find(r => r.type === 'visibility');
        if (visibilityRule) {
            isVisible = evaluateRule(visibilityRule, formValues);
        }
    }

    if (!isVisible) return null;

    // 2. Evaluate Required
    const isRequired = isFieldRequired(field, formValues);

    // 3. Evaluate ReadOnly
    // Check property (adapter might set it to boolean)
    let isReadOnly = field.readOnly === true;

    // Span calculation
    const spanClass = field.width === 'full' ? 'col-span-full' :
        field.width === '2/3' ? 'col-span-2' :
            field.width === '1/3' ? 'col-span-1' :
                field.width === '1/2' ? 'col-span-1' :
                    'col-span-1';

    return (
        <div className={cn("space-y-2", spanClass, field.className)}>
            {field.type !== 'label' && field.type !== 'section' && (
                <Label htmlFor={field.key} className="text-gray-700 font-medium">
                    {field.label}
                    {isRequired && <span className="text-red-500 mr-1">*</span>}
                </Label>
            )}

            <FieldInputSwitch field={field} isRequired={isRequired} isReadOnly={isReadOnly} />

            {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
            {error && <p className="text-sm text-red-500 flex items-center mt-1"><AlertCircle className="w-3 h-3 ml-1" />{error}</p>}
        </div>
    );
}

function FieldInputSwitch({ field, isRequired, isReadOnly }: { field: FieldDefinition, isRequired: boolean, isReadOnly: boolean }) {
    const { register, control } = useFormContext();

    // Disable all inputs if readOnly is true
    const commonProps = {
        disabled: isReadOnly
    };

    // Cast to any to handle legacy types from DB that match string but not strict FieldType union
    switch (field.type as any) {
        case 'text_single':
        case 'text':
        case 'email':
        case 'number':
        case 'decimal':
            if (!field.key) return <p className="text-red-500">Missing Key for {field.label}</p>;
            return (
                <Input
                    id={field.key}
                    type={mapInputType(field.type)}
                    placeholder={field.placeholder}
                    {...register(field.key, { required: isRequired ? "هذا الحقل مطلوب" : false })}
                    {...commonProps}
                />
            );
        case 'text_multi':
        case 'textarea':
            if (!field.key) return <p className="text-red-500">Missing Key for {field.label}</p>;
            return (
                <Textarea
                    id={field.key}
                    rows={field.config?.rows || 4}
                    placeholder={field.placeholder}
                    {...register(field.key, { required: isRequired ? "هذا الحقل مطلوب" : false })}
                    {...commonProps}
                />
            );
        case 'choice_multi':
        case 'choice_single':
        case 'select':
            // If it's single select, use Select component
            if (field.type === 'choice_single' || (field.type as string) === 'select') {
                if (!field.key) return <p className="text-red-500">Missing Key for {field.label}</p>;
                // Reuse LookupSelect logic or simple Select?
                // Let's rely on LookupSelect which handles static options too
                return (
                    <Controller
                        control={control}
                        name={field.key}
                        rules={{ required: isRequired ? "هذا الحقل مطلوب" : false }}
                        render={({ field: controllerField }) => (
                            <LookupSelect
                                field={field}
                                value={controllerField.value}
                                onChange={controllerField.onChange}
                                disabled={isReadOnly}
                            />
                        )}
                    />
                );
            }
            // Multi choice logic continues...
            return (
                <div className="space-y-2 border p-3 rounded-md">
                    {field.config?.options?.map((option: any) => (
                        <Controller
                            key={option.value}
                            control={control}
                            name={`${field.key}`}
                            // Complex: choice_multi usually stores array of strings. 
                            // Default RHF handling for checkboxes with same name is tricky without specialized logic.
                            // We will implement a simplified single boolean Checkbox per option mapped to an array?
                            // For simplicity/robustness in this phase, let's treat it as:
                            // We expect the value to be array. We toggle it.
                            render={({ field: { value, onChange } }) => {
                                const checked = Array.isArray(value) && value.includes(option.value);
                                return (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox
                                            id={`${field.key}_${option.value}`}
                                            checked={checked}
                                            disabled={isReadOnly}
                                            onCheckedChange={(c) => {
                                                const current = Array.isArray(value) ? value : [];
                                                if (c) {
                                                    onChange([...current, option.value]);
                                                } else {
                                                    onChange(current.filter((v: any) => v !== option.value));
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`${field.key}_${option.value}`} className="font-normal text-sm">
                                            {option.label}
                                        </Label>
                                    </div>
                                );
                            }}
                        />
                    ))}
                </div>
            );
        case 'checkbox':
        case 'yes_no':
            return (
                <Controller
                    control={control}
                    name={field.key}
                    rules={{ required: isRequired ? "يجب الموافقة على هذا الشرط" : false }}
                    render={({ field: controllerField }) => (
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                                id={field.key}
                                checked={controllerField.value}
                                onCheckedChange={controllerField.onChange}
                                disabled={isReadOnly}
                            />
                            <Label htmlFor={field.key} className="text-gray-700 font-medium">
                                {field.label}
                            </Label>
                        </div>
                    )}
                />
            );
        case 'date':
        case 'datetime':
            return (
                <Controller
                    control={control}
                    name={field.key}
                    rules={{ required: isRequired ? "هذا الحقل مطلوب" : false }}
                    render={({ field: controllerField }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    disabled={isReadOnly}
                                    className={cn(
                                        "w-full justify-start text-right font-normal",
                                        !controllerField.value && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="ml-2 h-4 w-4" />
                                    {controllerField.value ? (
                                        format(new Date(controllerField.value), "PPP", { locale: arSA })
                                    ) : (
                                        <span>{field.placeholder || "اختر تاريخ"}</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={controllerField.value ? new Date(controllerField.value) : undefined}
                                    onSelect={(d) => controllerField.onChange(d ? d.toISOString() : undefined)}
                                    initialFocus
                                    locale={arSA}
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                />
            );
        case 'attachment':
            // Simple File Input
            return (
                <div className="flex items-center gap-2">
                    <Input
                        type="file"
                        id={field.key}
                        {...register(field.key, { required: isRequired })}
                        disabled={isReadOnly}
                        className="cursor-pointer"
                    />
                </div>
            );
        case 'label':
            return <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{field.label}</p>;
        case 'lookup':
            return (
                <Controller
                    control={control}
                    name={field.key}
                    rules={{ required: isRequired ? "هذا الحقل مطلوب" : false }}
                    render={({ field: controllerField }) => (
                        <LookupSelect
                            field={field}
                            value={controllerField.value}
                            onChange={controllerField.onChange}
                            disabled={isReadOnly}
                        />
                    )}
                />
            );
        case 'section':
            return null;
        default:
            if (!field.key) return null; // Ignore unknown nameless fields
            return (
                <Input
                    id={field.key}
                    type="text"
                    placeholder={field.placeholder}
                    {...register(field.key, { required: isRequired ? "هذا الحقل مطلوب" : false })}
                    {...commonProps}
                />
            );
    }
}

// Helpers
function mapInputType(type: string) {
    if (type === 'number' || type === 'decimal') return 'number';
    if (type === 'email') return 'email';
    return 'text';
}

function isFieldRequired(field: FieldDefinition, contextValues?: any): boolean {
    if (field.rules && contextValues) {
        const requiredRule = field.rules.find(r => r.type === 'required');
        if (requiredRule) {
            return evaluateRule(requiredRule, contextValues);
        }
    }
    // Check if permissions/adapter set it to boolean
    return field.required === true;
}

function evaluateRule(rule: any, values: any): boolean {
    const value = values?.[rule.ifField];
    const targetValue = rule.value;

    switch (rule.operator) {
        case 'eq': return value == targetValue;
        case 'neq': return value != targetValue;
        default: return false;
    }
}

// Phase 5: Lookup Component
function LookupSelect({ field, value, onChange, disabled }: { field: FieldDefinition, value: any, onChange: (v: any) => void, disabled?: boolean }) {
    const [options, setOptions] = useState<{ label: string, value: any }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            try {
                // Determine source
                const source = field.config?.dataSource || { type: 'static', options: field.config?.options };
                const opts = await fetchLookupOptions(source.type as any, {
                    endpoint: source.endpoint,
                    lookupKey: source.lookupKey,
                    options: source.options
                });
                if (mounted) setOptions(opts);
            } catch (e) {
                console.error("Failed to load options", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [field.config?.dataSource, field.config?.options]);

    return (
        <Select
            value={value}
            onValueChange={onChange}
            disabled={disabled || loading}
        >
            <SelectTrigger>
                <SelectValue placeholder={loading ? "جاري التحميل..." : "اختر..."} />
            </SelectTrigger>
            <SelectContent>
                {options.map((opt, idx) => {
                    const safeValue = typeof opt.value === 'object' ? JSON.stringify(opt.value) : String(opt.value);
                    const safeKey = typeof opt.value === 'object' ? JSON.stringify(opt.value) : (opt.value || `opt-${idx}`);
                    let displayLabel = String(opt.label);
                    if (typeof opt.label === 'object' && opt.label !== null) {
                        const l = opt.label as any;
                        displayLabel = l.ar || l.name || l.label || l.en || JSON.stringify(l);
                    }
                    return (
                        <SelectItem key={safeKey} value={safeValue}>
                            {displayLabel}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}
