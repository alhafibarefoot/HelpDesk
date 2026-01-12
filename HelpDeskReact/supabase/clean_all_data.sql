-- سكريبت مسح جميع البيانات من قاعدة البيانات
-- نفذه في Supabase SQL Editor

-- تعطيل RLS مؤقتاً للسماح بالحذف
ALTER TABLE request_form_values DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_timeline DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;

-- حذف البيانات بالترتيب الصحيح (احترام القيود الخارجية)
TRUNCATE TABLE request_form_values CASCADE;
TRUNCATE TABLE request_timeline CASCADE;
TRUNCATE TABLE request_comments CASCADE;
TRUNCATE TABLE escalation_history CASCADE;
TRUNCATE TABLE error_logs CASCADE;
TRUNCATE TABLE requests CASCADE;
TRUNCATE TABLE workflow_templates CASCADE;
TRUNCATE TABLE workflows CASCADE;
TRUNCATE TABLE services CASCADE;

-- إعادة تفعيل RLS
ALTER TABLE request_form_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- عرض النتائج
SELECT 'services' as table_name, COUNT(*) as count FROM services
UNION ALL
SELECT 'workflows', COUNT(*) FROM workflows
UNION ALL
SELECT 'requests', COUNT(*) FROM requests
UNION ALL
SELECT 'request_form_values', COUNT(*) FROM request_form_values;
