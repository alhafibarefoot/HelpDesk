-- ==========================================
-- SCRIPT: FIX ALL DATABASE ISSUES (REVISED)
-- PURPOSE: Create missing tables, columns, and fix permissions (RLS)
-- INSTRUCTIONS: Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create 'users' table (Synchronized with Auth)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on users
alter table public.users enable row level security;
drop policy if exists "Public users are viewable by everyone" on public.users;
create policy "Public users are viewable by everyone" on public.users for select using (true);
drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- 2. BACKFILL USERS (MOVED UP) - Critical to run this BEFORE adding constraints
insert into public.users (id, email, full_name, role)
select id, email, raw_user_meta_data->>'full_name', coalesce(raw_user_meta_data->>'role', 'موظف')
from auth.users
on conflict (id) do nothing;

-- 3. CLEAN ORPHAN REQUESTS (Safety Step)
-- Delete requests that belong to users who no longer exist (to prevent FK errors)
delete from public.requests 
where requester_id not in (select id from public.users);

-- 4. FIX RELATIONSHIPS (Now safe to run)
alter table requests drop constraint if exists requests_requester_id_fkey;
alter table requests add constraint requests_requester_id_fkey foreign key (requester_id) references public.users(id) on delete cascade;

-- 5. Add missing columns to 'requests'
alter table public.requests add column if not exists current_step_id uuid;
-- alter table public.requests add column if not exists updated_at timestamptz default now(); 

-- 6. Create 'request_actions' table (Audit Log)
create table if not exists public.request_actions (
    id uuid default gen_random_uuid() primary key,
    request_id uuid references public.requests(id) on delete cascade not null,
    actor_id uuid references auth.users(id) on delete set null,
    action_type text not null,
    from_step_id uuid,
    to_step_id uuid,
    comment text,
    created_at timestamptz default now()
);

alter table public.request_actions enable row level security;
drop policy if exists "Admins can view actions" on public.request_actions;
create policy "Admins can view actions" on public.request_actions for select using (true);
drop policy if exists "Admins can insert actions" on public.request_actions;
create policy "Admins can insert actions" on public.request_actions for insert with check (auth.uid() = actor_id);

-- 7. FIX PERMISSIONS (RLS) - The reason updates fail silently
drop policy if exists "Allow authenticated update requests" on public.requests;
create policy "Allow authenticated update requests"
on public.requests
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated select requests" on public.requests;
create policy "Allow authenticated select requests"
on public.requests
for select
to authenticated
using (true);

-- 8. SETUP USER SYNC TRIGGER (For new signups)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'موظف'))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

