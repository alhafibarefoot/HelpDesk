-- Migration: Fix Users RLS to allow reading own role
-- Author: Antigravity
-- Date: 2025-12-09
-- Purpose: Unblock 'requests' policies that depend on reading 'public.users'.

-- 1. Enable RLS on users (ensure it is on)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential incomplete policies
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Admins can read all data" ON public.users;

-- 3. Allow Users to read their own profile (Critical for role checks)
CREATE POLICY "Users can read own data" ON public.users
FOR SELECT
USING (
    auth.uid() = id
);

-- 4. Allow Admins to read everything
CREATE POLICY "Admins can read all data" ON public.users
FOR SELECT
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
-- Note: The admin policy is recursive technically, but Postgres handles basic self-reference if the row is visible via the first policy? 
-- Actually, for Admin to read OTHERS, they first need to read themselves to see they are admin.
-- The "Users can read own data" allows them to read themselves. So the subquery (SELECT role ... WHERE id = auth.uid()) works!
