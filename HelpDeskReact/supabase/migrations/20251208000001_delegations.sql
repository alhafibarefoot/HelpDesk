-- Delegations Table for Task Substitution
CREATE TABLE IF NOT EXISTS public.delegations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES public.users(id) NOT NULL,
    to_user_id UUID REFERENCES public.users(id) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT delegation_users_check CHECK (from_user_id != to_user_id),
    CONSTRAINT delegation_dates_check CHECK (end_date > start_date)
);

-- Indexes
CREATE INDEX idx_delegations_from_user ON public.delegations(from_user_id);
CREATE INDEX idx_delegations_to_user ON public.delegations(to_user_id);
CREATE INDEX idx_delegations_active_range ON public.delegations(start_date, end_date) WHERE is_active = true;

-- RLS
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own delegations (incoming or outgoing)
CREATE POLICY "Users view own delegations" ON public.delegations
    FOR SELECT
    USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Policy: Users can create delegations for themselves
CREATE POLICY "Users create own delegations" ON public.delegations
    FOR INSERT
    WITH CHECK (auth.uid() = from_user_id);

-- Policy: Users can update their own delegations (e.g. cancel)
CREATE POLICY "Users manage own delegations" ON public.delegations
    FOR UPDATE
    USING (auth.uid() = from_user_id);

-- Policy: Admins can view all
CREATE POLICY "Admins view all delegations" ON public.delegations
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'helpdesk_admin'))
    );
