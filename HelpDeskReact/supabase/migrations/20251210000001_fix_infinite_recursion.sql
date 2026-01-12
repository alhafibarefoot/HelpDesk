-- Migration: Fix Infinite Recursion in RLS Policies
-- Author: Antigravity
-- Date: 2025-12-10
-- Purpose: Resolve "infinite recursion detected in policy for relation users" by using a SECURITY DEFINER function for role checks.

-- 1. Create Helper Function to Break Recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;

-- 2. Users Policies
DROP POLICY IF EXISTS "Admins can read all data" ON public.users;
CREATE POLICY "Admins can read all data" ON public.users
FOR SELECT
USING (
    get_my_role() = 'admin'
);

-- 3. Requests Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
CREATE POLICY "Users can view their own requests" ON public.requests
FOR SELECT
USING (
    auth.uid() = requester_id OR 
    get_my_role() = 'admin' OR
    get_my_role() = assigned_role
);

DROP POLICY IF EXISTS "Users can edit requests" ON public.requests;
CREATE POLICY "Users can edit requests" ON public.requests
FOR UPDATE
USING (
    get_my_role() = 'admin' OR
    get_my_role() = assigned_role
);

DROP POLICY IF EXISTS "Admins can delete requests" ON public.requests;
CREATE POLICY "Admins can delete requests" ON public.requests
FOR DELETE
USING (
    get_my_role() = 'admin'
);

-- 4. Delegations Policies
DROP POLICY IF EXISTS "Admins view all delegations" ON public.delegations;
CREATE POLICY "Admins view all delegations" ON public.delegations
FOR ALL
USING (
    get_my_role() IN ('admin', 'helpdesk_admin')
);

-- 5. Workflow Actions Policies
DROP POLICY IF EXISTS "Admins can manage workflow actions" ON public.workflow_actions;
CREATE POLICY "Admins can manage workflow actions" ON public.workflow_actions
USING (
    get_my_role() IN ('admin', 'helpdesk_admin')
)
WITH CHECK (
    get_my_role() IN ('admin', 'helpdesk_admin')
);

-- 6. Request Events Policies
DROP POLICY IF EXISTS "Users can view events for their requests" ON public.request_events;
CREATE POLICY "Users can view events for their requests" ON public.request_events
FOR SELECT
USING (
    exists (
        select 1 from public.requests r
        where r.id = request_events.request_id
        and (r.requester_id = auth.uid() or get_my_role() IN ('admin', 'helpdesk_admin'))
    )
);

-- Grants
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO anon;
