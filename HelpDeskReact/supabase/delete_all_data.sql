-- مسح جميع البيانات بشكل كامل
-- نفذ هذا السكريبت في Supabase SQL Editor

-- تعطيل RLS مؤقتاً للسماح بالحذف الكامل
ALTER TABLE request_form_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- حذف البيانات بالترتيب الصحيح (من الأطفال إلى الآباء)
-- 1. حذف البيانات المرتبطة بالطلبات
DELETE FROM request_form_values;
DELETE FROM request_timeline;
DELETE FROM request_comments;

-- 2. حذف الطلبات نفسها
DELETE FROM requests;

-- 3. حذف سير العمل والقوالب
DELETE FROM workflows;
DELETE FROM workflow_templates;

-- 4. أخيراً حذف الخدمات
DELETE FROM services;

-- إعادة تفعيل RLS
ALTER TABLE request_form_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- عرض النتائج للتأكد
SELECT 
    'services' as table_name, 
    COUNT(*) as remaining_records 
FROM services
UNION ALL
SELECT 'workflows', COUNT(*) FROM workflows
UNION ALL
SELECT 'requests', COUNT(*) FROM requests
UNION ALL
SELECT 'request_form_values', COUNT(*) FROM request_form_values
ORDER BY table_name;
