import { WorkflowDefinitionSchema } from './schemas/workflow';
import { z } from 'zod';

export type WorkflowValidationResult =
    | { success: true; data: z.infer<typeof WorkflowDefinitionSchema> }
    | { success: false; error: string; issues?: z.ZodIssue[] };

/**
 * Validates a workflow definition JSON against the strict v1.1 Schema.
 * NOTE: This is intended for NEW or UPDATED workflows. Legacy workflows might fail this.
 */
export function validateWorkflowDefinition(definition: any): WorkflowValidationResult {
    try {
        // 1. Basic Parse
        const parsed = WorkflowDefinitionSchema.parse(definition);
        return { success: true, data: parsed };
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Format error to be user-friendly
            const errorMessage = error.issues.map(issue => `[${issue.path.join('.')}] ${issue.message}`).join(', ');
            return {
                success: false,
                error: `Validation Failed: ${errorMessage}`,
                issues: error.issues
            };
        }
        return { success: false, error: 'Unknown validation error' };
    }
}
