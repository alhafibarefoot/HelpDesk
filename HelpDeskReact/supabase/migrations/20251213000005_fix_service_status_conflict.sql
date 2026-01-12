-- 1. تحديث البيانات (آمن للتشغيل المتكرر)
-- Update existing data mapping is_active to status
UPDATE public.services SET status = 'active' WHERE is_active = true AND status = 'draft';
UPDATE public.services SET status = 'suspended' WHERE is_active = false AND status = 'draft';

-- 2. إضافة قيد التحقق (مع حذف القيد القديم إذا وجد لتجنب الأخطاء)
-- Drop constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_status_check') THEN 
        ALTER TABLE public.services DROP CONSTRAINT services_status_check; 
    END IF; 
END $$;

-- Add the constraint
ALTER TABLE public.services ADD CONSTRAINT services_status_check 
CHECK (status IN ('draft', 'active', 'suspended', 'maintenance', 'archived'));

-- 3. تأكيد نجاح العملية
SELECT id, name, status, is_active FROM public.services LIMIT 5;
