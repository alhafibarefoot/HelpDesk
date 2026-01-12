import { z } from 'zod';

// ==========================================
// 1. Primitive Types
// ==========================================

const WorkflowVersionSchema = z.literal('1.0');

const PositionSchema = z.object({
    x: z.number(),
    y: z.number(),
});

const RoleSchema = z.enum(['employee', 'approver', 'service_owner', 'admin']);

const ActionTypeSchema = z.enum([
    'approve',
    'reject',
    'send_back',
    // 'custom' can be added later if needed, but for now we restrict to system actions
]);

// ==========================================
// 2. Node Schemas
// ==========================================

// 2.1 Start Node
const StartNodeSchema = z.object({
    id: z.string(),
    type: z.literal('start'),
    position: PositionSchema,
    data: z.object({
        label: z.string().optional().default('البداية'),
    }).optional(),
});

// 2.2 Task Node (Standard System Task)
const TaskNodeSchema = z.object({
    id: z.string(),
    type: z.literal('task'),
    position: PositionSchema,
    data: z.object({
        label: z.string().min(1, "Label is required"),
        role: RoleSchema,
        allowedActions: z.array(ActionTypeSchema).min(1, "At least one action is required"),
        sla_hours: z.number().optional(),
    }),
});

// 2.2a Approval Node (Frontend Alias for Task)
const ApprovalNodeSchema = z.object({
    id: z.string(),
    type: z.literal('approval'),
    position: PositionSchema,
    data: z.object({
        label: z.string().optional(),
        role: z.string().optional(),
        // Allow loose data for frontend-specific nodes
    }).passthrough(),
});

// 2.2b Action Node (Frontend Alias for Task)
const ActionNodeSchema = z.object({
    id: z.string(),
    type: z.literal('action'),
    position: PositionSchema,
    data: z.object({
        label: z.string().optional(),
        // Allow loose data
    }).passthrough(),
});

// 2.3 Gateway Node (Logic)
const GatewayNodeSchema = z.object({
    id: z.string(),
    type: z.literal('gateway'),
    position: PositionSchema,
    data: z.object({
        label: z.enum(['AND', 'OR']).default('AND'),
    }),
});

// 2.4 End Node
const EndNodeSchema = z.object({
    id: z.string(),
    type: z.literal('end'),
    position: PositionSchema,
    data: z.object({
        label: z.string().default('مكتمل'),
    }),
});

// 2.5 Join Node (Merge)
const JoinNodeSchema = z.object({
    id: z.string(),
    type: z.literal('join'),
    position: PositionSchema,
    data: z.object({
        label: z.string().optional(),
    }).optional(),
});

// 2.6 SubWorkflow Node
const SubWorkflowNodeSchema = z.object({
    id: z.string(),
    type: z.literal('subworkflow'),
    position: PositionSchema,
    data: z.object({
        label: z.string().optional(),
        service_key: z.string().optional(),
    }),
});

// 2.7 Condition Node (Frontend Logic)
const ConditionNodeSchema = z.object({
    id: z.string(),
    type: z.literal('condition'),
    position: PositionSchema,
    data: z.record(z.string(), z.any()).optional(), // Very loose to prevent blocking
});

// Discriminated Union of all allowed Nodes
const WorkflowNodeSchema = z.discriminatedUnion('type', [
    StartNodeSchema,
    TaskNodeSchema,
    GatewayNodeSchema,
    EndNodeSchema,
    JoinNodeSchema,
    SubWorkflowNodeSchema,
    ApprovalNodeSchema,
    ActionNodeSchema,
    ConditionNodeSchema,
]);

// ==========================================
// 3. Edge Schema
// ==========================================
const ConditionSchema = z.object({
    field: z.string(),
    operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains']),
    value: z.any()
});

const WorkflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
    data: z.object({
        condition: ConditionSchema.optional()
    }).optional()
});

// ==========================================
// 4. Full Definition Schema
// ==========================================
export const WorkflowDefinitionSchema = z.object({
    version: WorkflowVersionSchema.default('1.0'),
    nodes: z.array(WorkflowNodeSchema).min(2, "Workflow must have at least 2 nodes (Start & End)"),
    edges: z.array(WorkflowEdgeSchema).min(1, "Workflow must have edges"),
}).refine((data) => {
    const startNodes = data.nodes.filter(n => n.type === 'start');
    const endNodes = data.nodes.filter(n => n.type === 'end');
    return startNodes.length === 1 && endNodes.length >= 1;
}, {
    message: "Workflow must have exactly one Start node and at least one End node",
    path: ["nodes"]
});

export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;
