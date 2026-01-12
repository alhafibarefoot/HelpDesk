-- Up Migration: Core UX Schema Updates
-- Author: Antigravity
-- Date: 2025-12-07

-- 1. Add assigned_role column for efficient inbox filtering
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS assigned_role text DEFAULT NULL;

-- 2. Index for performance
CREATE INDEX IF NOT EXISTS idx_requests_assigned_role ON public.requests(assigned_role);

-- 3. Update RLS Policies to strictly follow the new requirements
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies to verify a clean state (names might vary, so we try commonly used ones or generic drop if possible, but safe specific drops are better)
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requests; -- Clean up any loose policies
DROP POLICY IF EXISTS "Requester View" ON public.requests;
DROP POLICY IF EXISTS "Admin View" ON public.requests;
DROP POLICY IF EXISTS "Assigned Role View" ON public.requests;

-- Strategy:
-- A. Requester: Can always view their own requests.
-- B. Admin: Can view/edit ALL requests.
-- C. Assigned Role: Can view requests assigned to their role.

-- Policy A: Requester View
CREATE POLICY "Requester View" ON public.requests
FOR SELECT 
USING (auth.uid() = requester_id);

-- Policy B: Admin Full Access (Select, Insert, Update, Delete)
CREATE POLICY "Admin Full Access" ON public.requests
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy C: Assigned Role View
-- Allows users to see requests currently waiting in their inbox
CREATE POLICY "Assigned Role View" ON public.requests
FOR SELECT 
USING (
  assigned_role = (
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1
  )
);

-- Also allow Updates for Assigned Role (to Approve/Reject)
CREATE POLICY "Assigned Role Update" ON public.requests
FOR UPDATE
USING (
  assigned_role = (
    SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1
  )
);

-- Note: We assume 'request_actions' table already has RLS or inherits properly. 
-- For Timeline visibility, users usually need to read 'request_actions' related to requests they can see.
-- We'll add a check for that too just in case.

ALTER TABLE public.request_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View Actions for Visible Requests" ON public.request_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.requests 
    WHERE id = request_actions.request_id
    -- This relies on the user having SELECT access to the request via above policies
  )
);

CREATE POLICY "Insert Actions for Authenticated" ON public.request_actions
FOR INSERT
WITH CHECK (auth.uid() = actor_id);
