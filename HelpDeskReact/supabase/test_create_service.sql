-- اختبار إنشاء خدمة بسيطة مباشرة
-- نفذ هذا السكريبت في Supabase SQL Editor

-- حذف الخدمة التجريبية إن وجدت
DELETE FROM workflows WHERE service_id IN (SELECT id FROM services WHERE key = 'test-service');
DELETE FROM services WHERE key = 'test-service';

-- إنشاء خدمة تجريبية
INSERT INTO services (key, name, description, is_active, status, default_sla_hours, form_schema)
VALUES (
    'test-service',
    'خدمة تجريبية',
    'خدمة للاختبار',
    true,
    'active',
    24,
    '{"fields": [{"id": "name", "type": "text", "label": "الاسم", "required": true}]}'::jsonb
)
RETURNING id, key, name, status;

-- إنشاء workflow للخدمة
INSERT INTO workflows (service_id, name, definition, is_active)
SELECT 
    id,
    'Test Workflow',
    '{"nodes": [{"id": "start", "type": "start", "data": {"label": "بداية"}, "position": {"x": 100, "y": 100}}], "edges": []}'::jsonb,
    true
FROM services
WHERE key = 'test-service'
RETURNING id, service_id, name;

-- التحقق من النتيجة
SELECT s.id, s.key, s.name, s.status, s.is_active, w.id as workflow_id
FROM services s
LEFT JOIN workflows w ON w.service_id = s.id
WHERE s.key = 'test-service';
