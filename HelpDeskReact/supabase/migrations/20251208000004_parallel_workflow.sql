-- 1. Create request_active_steps table to track multiple pointers
CREATE TABLE IF NOT EXISTS public.request_active_steps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
    step_id text NOT NULL, -- Corresponds to ReactFlow node id (string)
    status text NOT NULL CHECK (status IN ('active', 'completed')),
    started_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Ensure columns exist (for idempotency)
ALTER TABLE public.request_active_steps ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.requests(id) ON DELETE CASCADE;
ALTER TABLE public.request_active_steps ADD COLUMN IF NOT EXISTS step_id text NOT NULL;
ALTER TABLE public.request_active_steps ADD COLUMN IF NOT EXISTS status text NOT NULL CHECK (status IN ('active', 'completed'));
ALTER TABLE public.request_active_steps ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
ALTER TABLE public.request_active_steps ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 2. Enable RLS
ALTER TABLE public.request_active_steps ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "View active steps" ON public.request_active_steps;
CREATE POLICY "View active steps" 
ON public.request_active_steps FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.requests r 
        WHERE r.id = request_active_steps.request_id 
        AND (
            r.requester_id = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager', 'employee'))
        )
    )
);

-- 4. Migration: Populate active steps from existing current_step_id
-- Only for requests that are not completed/rejected and have a step
INSERT INTO public.request_active_steps (request_id, step_id, status)
SELECT id, current_step_id, 'active'
FROM public.requests
WHERE current_step_id IS NOT NULL 
  AND status NOT IN ('مكتمل', 'مرفوض', 'mlghi') -- 'mlghi' is cancelled
  AND NOT EXISTS (SELECT 1 FROM public.request_active_steps WHERE request_id = requests.id);
