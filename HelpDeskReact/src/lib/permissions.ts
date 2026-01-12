
import { User, WorkflowNode, ActionType } from "@/types";

/**
 * Checks if a user has permission to perform a specific action on a workflow step.
 * 
 * Logic:
 * 1. Admin Override: If user.role is 'admin', allow everything.
 * 2. Role Match: The user's role must match the step's assigned role exactly.
 * 3. Action Match: The requested action must be in the step's 'allowedActions' list.
 * 
 * @param user The authenticated user trying to perform the action.
 * @param step The current workflow node (must be of type 'task').
 * @param action The specific action being requested (e.g. 'approve').
 * @returns true if allowed, false otherwise.
 */
export function canUserPerformAction(
    user: User,
    step: WorkflowNode,
    action: ActionType
): boolean {
    // 1. Admin Override
    if (user.role === 'admin') {
        return true;
    }

    // Basic Validation
    if (step.type !== 'task' || !step.data) {
        return false;
    }

    // 2. Role Match
    const requiredRole = step.data.role;
    if (user.role !== requiredRole) {
        console.warn(`[Permission Denied] User Role '${user.role}' != Required Role '${requiredRole}'`);
        return false;
    }

    // 3. Action Match
    // Note: In strict mode, allowedActions is required by Schema. 
    // In legacy data, it might be missing, so we safely check.
    const allowedActions = step.data.allowedActions as ActionType[] | undefined;

    if (!allowedActions || !allowedActions.includes(action)) {
        console.warn(`[Permission Denied] Action '${action}' not in allowed list [${allowedActions?.join(', ')}]`);
        return false;
    }

    return true;
}
