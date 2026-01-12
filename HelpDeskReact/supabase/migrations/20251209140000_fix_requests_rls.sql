-- Migration: Fix RLS Policies for Requests
-- Author: Antigravity
-- Date: 2025-12-09
-- Purpose: Ensure authenticated users can INSERT requests and VIEW their own requests.

-- 1. Enable RLS (Ensure it is on)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing policies (Clean Slate)
DROP POLICY IF EXISTS "Requester View" ON public.requests;
DROP POLICY IF EXISTS "Admin Full Access" ON public.requests;
DROP POLICY IF EXISTS "Assigned Role View" ON public.requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;

-- 3. Create INSERT Policy (Authenticated Users)
-- Allow any authenticated user to create a request
CREATE POLICY "Users can create requests" ON public.requests
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() = requester_id
);

-- 4. Create SELECT Policy (Requester + Admin + Assignee)
CREATE POLICY "Users can view their own requests" ON public.requests
FOR SELECT
USING (
    auth.uid() = requester_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = assigned_role
);

-- 5. Create UPDATE Policy (Admin + Assignee)
CREATE POLICY "Users can edit requests" ON public.requests
FOR UPDATE
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = assigned_role
);

-- 6. Create DELETE Policy (Admin only)
CREATE POLICY "Admins can delete requests" ON public.requests
FOR DELETE
USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
