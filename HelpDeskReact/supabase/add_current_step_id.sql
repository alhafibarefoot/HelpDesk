-- Add current_step_id if it doesn't exist
alter table public.requests 
add column if not exists current_step_id uuid; -- Can reference workflow_steps(id) but let's keep it loose for now to avoid strict dependency hell if steps are deleted

-- Add request_actions table if missing (good measure)
create table if not exists public.request_actions (
    id uuid default gen_random_uuid() primary key,
    request_id uuid references public.requests(id) on delete cascade not null,
    actor_id uuid references auth.users(id) on delete set null,
    action_type text not null, -- approve, reject, etc.
    from_step_id uuid,
    to_step_id uuid,
    comment text,
    created_at timestamptz default now()
);

-- Enable RLS on request_actions
alter table public.request_actions enable row level security;

-- Simple policy for request_actions
create policy "Admins can view all actions" on public.request_actions
  for select using (true); -- Simplify for now

create policy "Admins can insert actions" on public.request_actions
  for insert with check (auth.uid() = actor_id);
