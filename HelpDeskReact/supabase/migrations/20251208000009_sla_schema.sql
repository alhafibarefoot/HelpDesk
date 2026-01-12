-- SLA Configuration Table
CREATE TABLE IF NOT EXISTS public.workflow_slas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    escalation_action TEXT NOT NULL, -- e.g., 'notify_supervisor', 'reassign', 'auto_approve'
    escalation_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workflow_id, step_id)
);

-- Ensure columns exist
ALTER TABLE public.workflow_slas ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE;
ALTER TABLE public.workflow_slas ADD COLUMN IF NOT EXISTS step_id TEXT NOT NULL;
ALTER TABLE public.workflow_slas ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL;
ALTER TABLE public.workflow_slas ADD COLUMN IF NOT EXISTS escalation_action TEXT NOT NULL;
ALTER TABLE public.workflow_slas ADD COLUMN IF NOT EXISTS escalation_config JSONB DEFAULT '{}';

-- Constraint
ALTER TABLE public.workflow_slas DROP CONSTRAINT IF EXISTS workflow_slas_workflow_id_step_id_key;
ALTER TABLE public.workflow_slas ADD CONSTRAINT workflow_slas_workflow_id_step_id_key UNIQUE(workflow_id, step_id);

-- Add SLA fields to Requests
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS step_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_time'; -- on_time, warning, breached

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_step_deadline ON public.requests(step_deadline) WHERE step_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_sla_status ON public.requests(sla_status);

-- RLS for SLAs
ALTER TABLE public.workflow_slas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage SLAs" ON public.workflow_slas;
CREATE POLICY "Admins manage SLAs" ON public.workflow_slas
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin'))
    );

DROP POLICY IF EXISTS "System/Everyone read SLAs" ON public.workflow_slas;
CREATE POLICY "System/Everyone read SLAs" ON public.workflow_slas
    FOR SELECT
    USING (true);
