-- Enable RLS on requests (if not already)
alter table public.requests enable row level security;

-- DROP existing policies to clean up
drop policy if exists "Enable read access for all users" on public.requests;
drop policy if exists "Enable insert for authenticated users only" on public.requests;
drop policy if exists "Enable update for users based on email" on public.requests;
drop policy if exists "Users can view own requests" on public.requests;
drop policy if exists "Admins can update requests" on public.requests;

-- 1. Everyone can Insert (Authenticated)
create policy "Authenticated can insert requests"
on public.requests for insert
to authenticated
with check (true);

-- 2. Everyone can View ALL requests (For Admin dashboard to work for now)
-- WARNING: In production, verify role = 'admin'. For dev, open to authenticated.
create policy "Authenticated can view all requests"
on public.requests for select
to authenticated
using (true);

-- 3. Everyone can UPDATE requests (CRITICAL FOR ADMIN ACTIONS)
-- WARNING: In production, strictly limit to admin role.
create policy "Authenticated can update requests"
on public.requests for update
to authenticated
using (true)
with check (true);
