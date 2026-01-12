-- Add role_type to step_field_permissions to distinguish between Assignee and Requester views

-- 1. Add column
ALTER TABLE public.step_field_permissions 
ADD COLUMN IF NOT EXISTS role_type text NOT NULL DEFAULT 'assignee';

-- 2. Add check constraint to ensure valid values
ALTER TABLE public.step_field_permissions 
ADD CONSTRAINT check_role_type CHECK (role_type IN ('assignee', 'requester', 'others'));

-- 3. Drop old unique constraint
ALTER TABLE public.step_field_permissions 
DROP CONSTRAINT IF EXISTS unique_step_field_permission;

-- 4. Add new unique constraint including role_type
ALTER TABLE public.step_field_permissions 
ADD CONSTRAINT unique_step_field_permission UNIQUE (workflow_id, step_id, field_key, role_type);

-- 5. Update RLS (Policies remain largely the same, but comment updated)
COMMENT ON COLUMN public.step_field_permissions.role_type IS 'Target audience for this permission: assignee (manager), requester (owner), or others';
