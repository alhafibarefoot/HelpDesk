"use server";

import { createClient } from "@/lib/supabase-server";
import { StepFieldPermission } from "@/types";

export async function getStepFieldPermissions(stepId: string): Promise<StepFieldPermission[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('step_field_permissions')
        .select('*')
        .eq('step_id', stepId);

    if (error) {
        throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    return (data || []) as StepFieldPermission[];
}

// Revalidate path is needed to refresh the page
import { revalidatePath } from "next/cache";

export async function setStepFieldPermissions(stepId: string, permissions: Partial<StepFieldPermission>[]): Promise<void> {
    const supabase = await createClient();

    // We use upsert to handle both insert and update
    // The UNIQUE constraint is now (workflow_id, step_id, field_key, role_type)
    const upsertData = permissions.map(p => ({
        workflow_id: (p as any).workflow_id, // Must be passed!
        step_id: stepId,
        field_key: p.field_key,
        role_type: p.role_type || 'assignee', // Default
        visible: p.visible ?? true,
        editable: p.editable ?? true,
        required_override: p.required_override,
        allowed_roles: p.allowed_roles,
        updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
        .from('step_field_permissions')
        .upsert(upsertData, { onConflict: 'workflow_id, step_id, field_key, role_type' });

    if (error) {
        console.error("Failed to save permissions:", error);
        throw new Error(`Failed to save permissions: ${error.message}`);
    }
}
