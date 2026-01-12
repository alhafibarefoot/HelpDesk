-- Add assigned_role column to requests if not exists
alter table public.requests add column if not exists assigned_role text;

-- Create request_events table
create table if not exists public.request_events (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests(id) on delete cascade,
  event_type text not null, -- e.g. 'created', 'status_changed', 'comment_added', 'attachment_added'
  old_status text,
  new_status text,
  actor_id uuid references auth.users(id),
  meta jsonb,
  created_at timestamptz default now()
);

-- Create request_comments table
create table if not exists public.request_comments (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.request_events enable row level security;
alter table public.request_comments enable row level security;

-- Policies for Request Events
drop policy if exists "Users can view events for requests they can view" on public.request_events;
create policy "Users can view events for requests they can view"
  on public.request_events for select
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_events.request_id
      and (r.requester_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = r.assigned_role))
    )
  );

-- Policies for Request Comments
drop policy if exists "Users can view comments for requests they can view" on public.request_comments;
create policy "Users can view comments for requests they can view"
  on public.request_comments for select
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_comments.request_id
      and (r.requester_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = r.assigned_role))
    )
  );

drop policy if exists "Users can insert comments for requests they can view" on public.request_comments;
create policy "Users can insert comments for requests they can view"
  on public.request_comments for insert
  with check (
    exists (
      select 1 from public.requests r
      where r.id = request_comments.request_id
      and (r.requester_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = r.assigned_role))
    )
  );
