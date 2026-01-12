-- Add columns for External HR Integration
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS employee_id TEXT,          -- The ID from the HR System (e.g. "1055")
ADD COLUMN IF NOT EXISTS hr_manager_id TEXT,        -- The Manager's ID from HR System (e.g. "1056")
ADD COLUMN IF NOT EXISTS direct_manager_id UUID REFERENCES public.users(id), -- The actual System Link to the Manager User
ADD COLUMN IF NOT EXISTS hr_data JSONB DEFAULT '{}'::jsonb; -- Flexible storage for all other HR fields (Department, JobStatus, ActingManager, etc.)

-- Create an index on employee_id for fast lookups during sync
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
