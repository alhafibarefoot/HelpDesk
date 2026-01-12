-- Create step_field_permissions table to manage field-level permissions per workflow step

CREATE TABLE IF NOT EXISTS public.step_field_permissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    step_id text NOT NULL, -- Node ID from ReactFlow (string)
    field_key text NOT NULL,
    visible boolean DEFAULT true,
    editable boolean DEFAULT true,
    required_override boolean DEFAULT NULL, -- NULL means inherit from schema, true/false overrides
    allowed_roles jsonb DEFAULT NULL, -- Array of roles allowed to interact, NULL means all
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Ensure unique permission per field per step within a workflow
    CONSTRAINT unique_step_field_permission UNIQUE (workflow_id, step_id, field_key)
);

-- Ensure columns exist
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS step_id text NOT NULL;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS field_key text NOT NULL;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS editable boolean DEFAULT true;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS required_override boolean DEFAULT NULL;
ALTER TABLE public.step_field_permissions ADD COLUMN IF NOT EXISTS allowed_roles jsonb DEFAULT NULL;

-- Constraint
ALTER TABLE public.step_field_permissions DROP CONSTRAINT IF EXISTS unique_step_field_permission;
ALTER TABLE public.step_field_permissions ADD CONSTRAINT unique_step_field_permission UNIQUE (workflow_id, step_id, field_key);

-- Index for faster lookups during rendering (now by workflow and step)
CREATE INDEX IF NOT EXISTS idx_step_field_permissions_lookup ON public.step_field_permissions(workflow_id, step_id);

-- Enable RLS
ALTER TABLE public.step_field_permissions ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Select: Authenticated users can view permissions (needed for rendering forms)
DROP POLICY IF EXISTS "Authenticated users can view step permissions" ON public.step_field_permissions;
CREATE POLICY "Authenticated users can view step permissions"
ON public.step_field_permissions
FOR SELECT
TO authenticated
USING (true);

-- 2. Manage: only admins or service owners should manage permissions
-- For now, we allow authenticated to facilitate development, but in prod this should be restricted
DROP POLICY IF EXISTS "Admins can manage step permissions" ON public.step_field_permissions;
CREATE POLICY "Admins can manage step permissions"
ON public.step_field_permissions
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'service_owner')
    )
);

-- Grant permissions
GRANT SELECT ON public.step_field_permissions TO authenticated;
GRANT ALL ON public.step_field_permissions TO service_role;
