-- Up Migration: Migrate Arabic Roles to English System Roles
-- Author: Antigravity
-- Date: 2025-12-07

-- 1. Migrate 'موظف' -> 'employee'
UPDATE public.users 
SET role = 'employee' 
WHERE role = 'موظف';

-- 2. Migrate 'مدير' -> 'admin'
UPDATE public.users 
SET role = 'admin' 
WHERE role = 'مدير';

-- 3. Migrate 'مسؤول خدمة' -> 'service_owner'
UPDATE public.users 
SET role = 'service_owner' 
WHERE role = 'مسؤول خدمة';

-- 4. Migrate 'مشرف' -> 'approver' (Approver is a generic supervisor role)
UPDATE public.users 
SET role = 'approver' 
WHERE role = 'مشرف';

-- Verify counts
-- SELECT role, count(*) FROM public.users GROUP BY role;
