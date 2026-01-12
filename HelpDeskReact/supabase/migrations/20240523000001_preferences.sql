-- Create user_notification_preferences table
create table if not exists public.user_notification_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  notification_type text not null,
  channel text not null default 'in_app',
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, notification_type, channel)
);

-- Enable RLS
alter table public.user_notification_preferences enable row level security;

-- Policies
drop policy if exists "Users can view their own preferences" on public.user_notification_preferences;
create policy "Users can view their own preferences"
  on public.user_notification_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own preferences" on public.user_notification_preferences;
create policy "Users can insert their own preferences"
  on public.user_notification_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own preferences" on public.user_notification_preferences;
create policy "Users can update their own preferences"
  on public.user_notification_preferences for update
  using (auth.uid() = user_id);

-- Secure Helper RPC to get preferences (useful for cross-user notifications)
create or replace function public.get_user_preferences(p_user_id uuid)
returns table (notification_type text, enabled boolean)
security definer
as $$
begin
  return query
  select np.notification_type, np.enabled
  from public.user_notification_preferences np
  where np.user_id = p_user_id and np.channel = 'in_app';
end;
$$ language plpgsql;
