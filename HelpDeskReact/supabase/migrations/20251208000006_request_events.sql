-- Create request_events table for rich audit trail
create table if not exists public.request_events (
    id uuid default gen_random_uuid() primary key,
    request_id uuid references public.requests(id) not null,
    step_id text, -- Node ID (string)
    event_type text not null, -- 'field_update', 'status_change', 'comment', 'assignment', 'sla_breach'
    performed_by uuid references auth.users(id),
    performed_at timestamptz default now(),
    payload jsonb default '{}'::jsonb -- dynamic data: { field: 'priority', old: 'low', new: 'high' }
);

-- Ensure columns exist
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS request_id uuid references public.requests(id) not null;
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS step_id text;
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS event_type text not null;
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS performed_by uuid references auth.users(id);
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS performed_at timestamptz default now();
ALTER TABLE public.request_events ADD COLUMN IF NOT EXISTS payload jsonb default '{}'::jsonb;

-- Constraint
ALTER TABLE public.request_events DROP CONSTRAINT IF EXISTS fk_request;
ALTER TABLE public.request_events ADD CONSTRAINT fk_request foreign key (request_id) references public.requests(id) on delete cascade;

-- Enable RLS
alter table public.request_events enable row level security;

-- Policies
DROP POLICY IF EXISTS "Users can view events for their requests" ON public.request_events;
create policy "Users can view events for their requests"
    on public.request_events for select
    using (
        exists (
            select 1 from public.requests r
            where r.id = request_events.request_id
            and (r.requester_id = auth.uid() or auth.uid() in (select id from public.users where role in ('admin', 'helpdesk_admin')))
        )
    );

DROP POLICY IF EXISTS "Admins and System can insert events" ON public.request_events;
create policy "Admins and System can insert events"
    on public.request_events for insert
    with check (true); -- Usually inserted via server actions/triggers
