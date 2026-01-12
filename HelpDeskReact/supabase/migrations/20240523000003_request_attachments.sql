-- Create request_attachments table
create table if not exists public.request_attachments (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests(id) on delete cascade,
  file_name text not null,
  file_size bigint,
  file_type text,
  storage_path text not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.request_attachments enable row level security;

-- Policies
drop policy if exists "Users can view attachments for requests they can view" on public.request_attachments;
create policy "Users can view attachments for requests they can view"
  on public.request_attachments for select
  using (
    exists (
      select 1 from public.requests r
      where r.id = request_attachments.request_id
      and (r.requester_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = r.assigned_role))
    )
  );

drop policy if exists "Users can insert attachments for requests they can view" on public.request_attachments;
create policy "Users can insert attachments for requests they can view"
  on public.request_attachments for insert
  with check (
    exists (
      select 1 from public.requests r
      where r.id = request_attachments.request_id
      and (r.requester_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = r.assigned_role))
    )
  );

-- Also allow deletion if needed (usually requester or assignee)
drop policy if exists "Users can delete their own attachments" on public.request_attachments;
create policy "Users can delete their own attachments"
  on public.request_attachments for delete
  using (uploaded_by = auth.uid());
