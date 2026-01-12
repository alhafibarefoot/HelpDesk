-- إنشاء خدمة اختبارية لطلب إجازة
-- نفذ هذا السكريبت في Supabase SQL Editor

-- تعطيل RLS مؤقتاً
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE workflows DISABLE ROW LEVEL SECURITY;

-- إنشاء الخدمة
INSERT INTO services (key, name, description, is_active, status, default_sla_hours, form_schema)
VALUES (
    'leave-request',
    'طلب إجازة',
    'خدمة طلب إجازة - تم إنشاؤها للاختبار',
    true,
    'active',
    24,
    '{
        "fields": [
            {
                "id": "leaveType",
                "type": "select",
                "label": "نوع الإجازة",
                "required": true,
                "options": ["إجازة سنوية", "إجازة مرضية", "إجازة طارئة"]
            },
            {
                "id": "startDate",
                "type": "date",
                "label": "تاريخ البداية",
                "required": true
            },
            {
                "id": "endDate",
                "type": "date",
                "label": "تاريخ النهاية",
                "required": true
            },
            {
                "id": "reason",
                "type": "textarea",
                "label": "السبب",
                "required": false
            }
        ]
    }'::jsonb
)
RETURNING id;

-- إنشاء سير العمل (استبدل SERVICE_ID_HERE بالـ ID الذي ظهر من الاستعلام السابق)
-- أو استخدم هذا الاستعلام الذي يجد الخدمة تلقائياً:
INSERT INTO workflows (service_id, name, definition, is_active)
SELECT 
    id,
    'Workflow for leave-request',
    '{
        "nodes": [
            {"id": "start", "type": "start", "data": {"label": "بداية"}, "position": {"x": 100, "y": 100}},
            {"id": "review", "type": "task", "data": {"label": "مراجعة الطلب"}, "position": {"x": 100, "y": 200}},
            {"id": "end", "type": "end", "data": {"label": "موافق"}, "position": {"x": 100, "y": 300}}
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "review"},
            {"id": "e2", "source": "review", "target": "end"}
        ]
    }'::jsonb,
    true
FROM services
WHERE key = 'leave-request';

-- إعادة تفعيل RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- التحقق من النتيجة
SELECT id, key, name, status, is_active FROM services WHERE key = 'leave-request';
