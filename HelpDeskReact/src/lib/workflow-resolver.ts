import { createClient } from "@/lib/supabase-server";
import { SupabaseClient } from "@supabase/supabase-js";

export type ResolutionResult = {
    assigneeId: string | null;
    assigneeRole: string | null;
    error?: string;
};

/**
 * Resolves the assignee for a specific workflow step based on the defined role and the original requester.
 * Enforces strict hierarchy traversal starting from the requester.
 * 
 * Supported Roles:
 * - DIRECT_MANAGER: Requester's direct manager (Level 1)
 * - MANAGER_LEVEL_2: Requester's Manager's Manager
 * - MANAGER_LEVEL_3: ... and so on
 * - DEPARTMENT_HEAD: (Placeholder for future logic, currently maps to Level 2 or specific lookup)
 * 
 * @param requestId The ID of the request (used for context/logging if needed, though we primarily use requesterId)
 * @param role The role string defined in the workflow node (e.g., "DIRECT_MANAGER", "MANAGER_LEVEL_2")
 * @param requesterId The UUID of the user who initiated the request
 * @param client Optional Supabase client to reuse
 */
export async function resolveStepAssignee(
    requestId: string,
    role: string,
    requesterId: string,
    client?: SupabaseClient
): Promise<ResolutionResult> {
    const supabase = client || await createClient();

    // 1. Handle Static/System Roles immediately (if any specific logic exists, otherwise pass through)
    // For now, we assume everything that isn't special is a system role (e.g. 'admin', 'hr_specialist')
    // dependent on how the task system handles 'assigned_to_role' vs 'assigned_to_user'.
    const dynamicRoles = ['DIRECT_MANAGER', 'MANAGER_LEVEL_2', 'MANAGER_LEVEL_3', 'MANAGER_LEVEL_4'];
    if (!dynamicRoles.includes(role)) {
        return { assigneeId: null, assigneeRole: role };
    }

    // 2. Determine target level
    let targetLevel = 1;
    if (role === 'DIRECT_MANAGER') targetLevel = 1;
    else if (role === 'MANAGER_LEVEL_2') targetLevel = 2;
    else if (role === 'MANAGER_LEVEL_3') targetLevel = 3;
    else if (role === 'MANAGER_LEVEL_4') targetLevel = 4;

    // 3. Traverse Hierarchy
    let currentUserId = requesterId;
    let currentManagerId: string | null = null;

    // We purposefully fetch level by level to ensure the chain exists.
    // Optimization: We could write a recursive CTE in SQL, but iterative loop is safer for logic control here for now.

    for (let i = 1; i <= targetLevel; i++) {
        const { data: userProfile, error } = await supabase
            .from('users')
            .select('id, direct_manager_id, email')
            .eq('id', currentUserId)
            .single();

        if (error || !userProfile) {
            throw new Error(`ASSIGNMENT_ERROR: Could not fetch user profile for ID ${currentUserId} at level ${i - 1}`);
        }

        if (!userProfile.direct_manager_id) {
            // BROKEN CHAIN
            console.error(`[WorkflowResolver] Broken chain at level ${i}. User ${userProfile.email} has no manager.`);
            throw new Error(`ASSIGNEE_NOT_RESOLVED: Hierarchy broken. User ${userProfile.email} has no manager configured. Cannot resolve ${role}.`);
        }

        currentManagerId = userProfile.direct_manager_id;
        currentUserId = currentManagerId as string; // Move up
    }

    if (!currentManagerId) {
        // Should be caught by the loop, but safety check
        throw new Error(`ASSIGNEE_NOT_RESOLVED: Failed to resolve manager for role ${role}`);
    }

    return {
        assigneeId: currentManagerId,
        assigneeRole: null // We resolved to a specific user
    };
}
