import { FormSchema, StepFieldPermission, FieldDefinition, UserRole } from "@/types";

export function applyStepPermissions(
    schema: FormSchema,
    permissions: StepFieldPermission[],
    userRoles: UserRole[] = []
): FormSchema {
    // Deep clone to avoid mutating the original schema
    const newSchema: FormSchema = JSON.parse(JSON.stringify(schema));

    if (!newSchema.pages) return newSchema;

    newSchema.pages.forEach(page => {
        page.sections.forEach(section => {
            section.fields = section.fields.map(field => {
                return applyFieldPermission(field, permissions, userRoles);
            });
        });
    });

    return newSchema;
}

function applyFieldPermission(
    field: FieldDefinition,
    permissions: StepFieldPermission[],
    userRoles: UserRole[]
): FieldDefinition {
    // Find permission for this specific field
    const perm = permissions.find(p => p.field_key === field.key);

    if (!perm) {
        // No specific permission set for this step, return field as is
        // Or should we default to something? Usually if no permission record exists,
        // it means "use schema defaults".
        return field;
    }

    // 1. Check Role Access (ACL)
    if (perm.allowed_roles && perm.allowed_roles.length > 0) {
        const hasRole = perm.allowed_roles.some(role => userRoles.includes(role));
        if (!hasRole) {
            // User doesn't have permission to see this field
            return { ...field, hidden: true };
        }
    }

    // 2. Apply Visibility
    // If permission says explicitly visible=false, we hide it.
    // If visible=true, we keep it (unless schema logic hides it elsewhere, 
    // but here we override schema 'hidden' static property if it conflicts?
    // Usually step permission overrides schema default)
    if (perm.visible === false) {
        return { ...field, hidden: true };
    }

    // 3. Apply Editable (Read Only)
    if (perm.editable === false) {
        // If schema already had readOnly logic, we might need to handle it.
        // For now, we force specific boolean override.
        field.readOnly = true;
    }

    // 4. Apply Required Override
    // If not null, it overrides the schema
    if (perm.required_override !== null && perm.required_override !== undefined) {
        field.required = perm.required_override;
    }

    return field;
}
