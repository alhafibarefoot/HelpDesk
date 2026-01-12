-- Create workflow_actions table for automation
create table if not exists public.workflow_actions (
    id uuid default gen_random_uuid() primary key,
    workflow_id uuid references public.workflows(id) on delete cascade not null,
    node_id text not null, -- The workflow node ID (string) this action follows
    trigger_type text not null, -- 'on_enter', 'on_approve', 'on_reject', 'on_complete'
    action_type text not null, -- 'send_email', 'webhook', 'set_field'
    config jsonb default '{}'::jsonb, -- configuration for the action
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Ensure columns exist
ALTER TABLE public.workflow_actions ADD COLUMN IF NOT EXISTS workflow_id uuid references public.workflows(id) on delete cascade not null;
ALTER TABLE public.workflow_actions ADD COLUMN IF NOT EXISTS node_id text not null;
ALTER TABLE public.workflow_actions ADD COLUMN IF NOT EXISTS trigger_type text not null;
ALTER TABLE public.workflow_actions ADD COLUMN IF NOT EXISTS action_type text not null;
ALTER TABLE public.workflow_actions ADD COLUMN IF NOT EXISTS config jsonb default '{}'::jsonb;

-- Enable RLS
alter table public.workflow_actions enable row level security;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Admins can manage workflow actions" ON public.workflow_actions;
create policy "Admins can manage workflow actions"
    on public.workflow_actions
    using (
        exists (
            select 1 from public.users
            where id = auth.uid()
            and role in ('admin', 'helpdesk_admin')
        )
    )
    with check (
        exists (
            select 1 from public.users
            where id = auth.uid()
            and role in ('admin', 'helpdesk_admin')
        )
    );

DROP POLICY IF EXISTS "System can read workflow actions" ON public.workflow_actions;
create policy "System can read workflow actions"
    on public.workflow_actions for select
    using (true);
