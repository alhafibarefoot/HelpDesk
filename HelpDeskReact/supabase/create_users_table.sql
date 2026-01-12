-- 1. Create public.users table (often called profiles)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'user',
  department text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.users enable row level security;

-- 3. Create policies
create policy "Public users are viewable by everyone." on public.users
  for select using (true);

create policy "Users can insert their own profile." on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.users
  for update using (auth.uid() = id);

-- 4. Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'موظف')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Backfill existing users from auth.users
insert into public.users (id, email, full_name, role)
select 
    id, 
    email, 
    raw_user_meta_data->>'full_name',
    coalesce(raw_user_meta_data->>'role', 'موظف')
from auth.users
on conflict (id) do nothing;

-- 7. Fix Foreign Key on requests to reference public.users for easier joins (PostgREST requirement for embedding)
-- Note: It might currently reference auth.users. 
-- PostgREST can sometimes detect FKs to auth.users but cannot embed them directly in the standard client way easily without configuration.
-- Explicitly referencing public.users is the standard way.

alter table requests
drop constraint if exists requests_requester_id_fkey;

alter table requests
add constraint requests_requester_id_fkey
foreign key (requester_id)
references public.users(id)
on delete cascade;
