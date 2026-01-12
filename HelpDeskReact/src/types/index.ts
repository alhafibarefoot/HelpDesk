export type UserRole = 'employee' | 'approver' | 'service_owner' | 'admin';
export type ServiceStatus = 'جديد' | 'قيد المراجعة' | 'قيد التنفيذ' | 'موقوف' | 'مكتمل' | 'مرفوض' | 'ملغي' | 'متأخر';
export type RequestPriority = 'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل';
export type StepType = 'اعتماد' | 'تنفيذ' | 'إشعار';
export type ActionType = 'إنشاء' | 'إرسال' | 'اعتماد' | 'رفض' | 'تنفيذ' | 'تحديث' | 'إغلاق' | 'إلغاء';

// Simple condition (legacy support)
export interface SimpleCondition {
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
}

// Complex condition with AND/OR logic
export interface ComplexCondition {
    type: 'and' | 'or';
    conditions: (SimpleCondition | ComplexCondition)[];
}

// Union type for both simple and complex conditions
export type Condition = SimpleCondition | ComplexCondition;

export interface User {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    department?: string;
    created_at: string;
}

export type ServiceLifecycleStatus = 'draft' | 'active' | 'suspended' | 'maintenance';

export interface Service {
    id: string;
    key: string;
    name: string;
    description?: string;
    owning_department?: string;
    default_sla_hours: number;
    is_active: boolean; // Legacy: true if status is 'active'
    status: ServiceLifecycleStatus;
    form_schema?: FormSchema;
    created_at: string;
}

export interface ServiceForm {
    id: string;
    service_id: string;
    schema_json: FormSchema;
    created_at: string;
}

// --- Enterprise Form Builder V2 Types ---

export type FieldType =
    | 'text_single' | 'text_multi' | 'number' | 'decimal' | 'email'
    | 'date' | 'datetime' | 'time'
    | 'yes_no' | 'choice_single' | 'choice_multi' | 'checkbox'
    | 'user_picker' | 'item_list' | 'attachment'
    | 'label' | 'section' | 'rich_text' | 'lookup';

export type LogicOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'isEmpty' | 'isNotEmpty';

export interface LogicCondition {
    field: string;
    operator: LogicOperator;
    value: any;
}

export interface LogicRule {
    operator: 'AND' | 'OR';
    conditions: (LogicCondition | LogicRule)[];
}

export interface FieldDataSource {
    type: 'static' | 'api' | 'global';
    options?: { label: string; value: any }[]; // For static
    endpoint?: string; // For api
    lookupKey?: string; // For global
}

export interface FieldValidation {
    type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'regex' | 'custom';
    value?: any;
    message: string;
}

export interface FieldDefinition {
    id: string;
    key: string;
    type: FieldType;
    label: string;
    description?: string; // Help text
    placeholder?: string;

    // State & Behavior
    defaultValue?: any;
    readOnly?: boolean | LogicRule;
    hidden?: boolean | LogicRule; // Visibility rule
    required?: boolean | LogicRule;

    // Configuration
    config?: {
        options?: { label: string; value: string }[]; // Simple static options
        dataSource?: FieldDataSource;
        rows?: number; // For textarea
        accept?: string; // For file
        multiple?: boolean;
        [key: string]: any;
    };

    validation?: FieldValidation[];
    rules?: FieldRule[]; // Simple rules engine

    // Layout
    width?: 'full' | '1/2' | '1/3' | '2/3' | '1/4';
    className?: string;
}

export interface FieldRule {
    type: 'visibility' | 'required';
    ifField: string;
    operator: 'eq' | 'neq'; // Simple equality check for now
    value: any;
}

export interface FormSection {
    id: string;
    title?: string;
    description?: string;
    columns: 1 | 2 | 3 | 4;
    fields: FieldDefinition[];
    visibilityRule?: LogicRule;
    isCollapsible?: boolean;
}

export interface FormPage {
    id: string;
    title: string;
    description?: string;
    sections: FormSection[];
    visibilityRule?: LogicRule;
}

export interface FormSchema {
    version: '2.0';
    settings?: {
        layout: 'single_page' | 'wizard' | 'tabs';
        showProgressBar?: boolean;
        rtl?: boolean;
    };
    pages: FormPage[];
}

// Legacy support alias (to help identify migration spots)
export interface LegacyFormField {
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
}


export interface Workflow {
    id: string;
    service_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface WorkflowStep {
    id: string;
    workflow_id: string;
    step_order: number;
    name: string;
    step_type: StepType;
    assigned_role?: string;
    assigned_department?: string;
    requires_all_approvers: boolean;
    condition?: Condition; // Updated to support complex conditions
    sla_hours?: number;
    created_at: string;
}

export interface Request {
    id: string;
    request_number: string;
    service_id: string;
    requester_id: string;
    title: string;
    description?: string;
    status: ServiceStatus;
    priority: RequestPriority;
    department?: string;
    current_step_id?: string;
    current_step_key?: string;
    sla_due_at?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    form_schema_snapshot?: FormSchema;

    // Joins
    service?: Service;
    requester?: User;
    current_step?: WorkflowStep;
}

export interface RequestFormValue {
    id: string;
    request_id: string;
    form_data: Record<string, any>;
    created_at: string;
}

export interface RequestAction {
    id: string;
    request_id: string;
    actor_id: string;
    action_type: ActionType;
    from_step_id?: string;
    to_step_id?: string;
    from_step_key?: string;
    to_step_key?: string;
    comment?: string;
    created_at: string;

    // Joins
    actor?: User;
}

export interface RequestEvent {
    id: string;
    request_id: string;
    step_id?: string;
    event_type: string;
    performed_by?: string;
    performed_at: string;
    payload: Record<string, any>;
    meta?: Record<string, any>;

    // Joins
    performer?: User;
}

export interface RequestAttachment {
    id: string;
    request_id: string;
    file_name: string;
    file_url: string;
    uploaded_by: string;
    created_at: string;
}

export interface RequestComment {
    id: string;
    request_id: string;
    user_id: string;
    content: string;
    mentions: string[]; // Array of user IDs
    is_internal: boolean;
    created_at: string;

    // Joins
    user?: {
        full_name: string;
        email: string;
        avatar_url?: string;
    };
}

export interface RequestActiveStep {
    id: string;
    request_id: string;
    step_id: string;
    step_key: string;
    status: 'active' | 'completed';
    started_at: string;
    completed_at?: string;
}

export interface WorkflowNode {
    id: string;
    type: string; // 'start', 'approval', 'action', 'end', 'gateway', 'join', 'subworkflow', 'parallel_fork', 'parallel_join'
    position: { x: number; y: number };
    data: {
        label?: string;
        role?: string; // For approval steps
        sla_hours?: number;
        service_key?: string; // For sub-workflows
        [key: string]: any;
    };
}


export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    type?: string;
    condition?: string;
    condition_type?: 'expression' | 'field_equals';
    condition_value?: any;
    data?: any;
}

export interface WorkflowDefinition {
    version: '1.0';
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface StepFieldPermission {
    id: string;
    step_id: string;
    field_key: string;
    visible: boolean;
    editable: boolean;
    required_override: boolean | null;
    allowed_roles: UserRole[] | null;
    role_type: 'assignee' | 'requester' | 'others';
    created_at: string;
    updated_at: string;
}
