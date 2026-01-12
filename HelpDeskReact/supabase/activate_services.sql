-- تفعيل جميع الخدمات المحفوظة
-- نفذ هذا السكريبت في Supabase SQL Editor

UPDATE services 
SET status = 'active', is_active = true
WHERE status = 'draft';

-- عرض النتيجة
SELECT id, key, name, status, is_active 
FROM services 
ORDER BY created_at DESC;
