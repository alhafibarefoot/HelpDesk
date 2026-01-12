-- Drop table and dependent objects
DROP TABLE IF EXISTS public.workflow_tasks CASCADE;

-- Re-create table
CREATE TABLE public.workflow_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE NOT NULL,
    step_id TEXT NOT NULL,
    assigned_to_user UUID REFERENCES public.users(id),
    assigned_to_role TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT task_assignment_check CHECK (assigned_to_user IS NOT NULL OR assigned_to_role IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_request_id ON public.workflow_tasks(request_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_user ON public.workflow_tasks(assigned_to_user);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_role ON public.workflow_tasks(assigned_to_role);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON public.workflow_tasks(status);

-- RLS
ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.workflow_tasks;
CREATE POLICY "Users can view their assigned tasks" ON public.workflow_tasks
    FOR SELECT
    USING (
        (assigned_to_user = auth.uid()) OR
        (assigned_to_role IN (SELECT role FROM public.users WHERE id = auth.uid())) OR
        (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin')))
    );

DROP POLICY IF EXISTS "Admins can manage tasks" ON public.workflow_tasks;
CREATE POLICY "Admins can manage tasks" ON public.workflow_tasks
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin'))
    );
