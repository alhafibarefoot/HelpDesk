-- Comments Table
CREATE TABLE IF NOT EXISTS public.request_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.requests(id) NOT NULL,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of user_ids mentioned
    is_internal BOOLEAN DEFAULT false, -- If true, visible only to employees/admins
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.requests(id) NOT NULL;
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) NOT NULL;
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS content TEXT NOT NULL;
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE public.request_comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON public.request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.request_comments(created_at);

-- RLS
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone involved can read public comments
-- (Requester, Assignees, Admins)
DROP POLICY IF EXISTS "Users read comments on visible requests" ON public.request_comments;
CREATE POLICY "Users read comments on visible requests" ON public.request_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = request_id
            -- AND (r.requester_id = auth.uid() OR ...) -> Rely on requests RLS? 
            -- No, internal queries inside RLS can be expensive or recursive.
            -- Let's duplicate basic visibility logic:
            AND (
                r.requester_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.request_id = r.id AND (t.assigned_to_user = auth.uid() OR t.assigned_to_role = (SELECT role FROM public.users WHERE id = auth.uid()))) OR
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin'))
                -- Also consider delegation? For now basic.
            )
        )
    );

DROP POLICY IF EXISTS "Users create comments on visible requests" ON public.request_comments;
CREATE POLICY "Users create comments on visible requests" ON public.request_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id = request_id
             AND (
                r.requester_id = auth.uid() OR
                EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.request_id = r.id AND (t.assigned_to_user = auth.uid() OR t.assigned_to_role = (SELECT role FROM public.users WHERE id = auth.uid()))) OR
                EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin'))
            )
        )
    );
