-- Seed Services
INSERT INTO services (key, name, description, owning_department, default_sla_hours) VALUES
('it_helpdesk', 'الدعم الفني', 'حل مشاكل الحاسب الآلي والشبكات والبرمجيات', 'إدارة تقنية المعلومات', 24),
('meeting_room', 'حجز قاعات الاجتماعات', 'حجز القاعات للاجتماعات الرسمية', 'إدارة الخدمات العامة', 8),
('business_travel', 'السفر الرسمي', 'طلب تذاكر سفر وإقامة لمهمة عمل', 'الموارد البشرية', 72),
('media_request', 'الطلبات الإعلامية', 'تغطية إعلامية، تصميم، أو نشر خبر', 'العلاقات العامة والإعلام', 48),
('transportation', 'النقل والمراسلات', 'طلب سيارة أو توصيل طرد', 'الخدمات العامة', 4),
('stationery', 'القرطاسية', 'طلب أدوات مكتبية وقرطاسية', 'المستودعات', 24),
('building_maintenance', 'المباني والصيانة', 'صيانة كهرباء، سباكة، أو تكييف', 'الخدمات العامة', 48);

-- Seed Workflows (Example: IT Helpdesk)
DO $$
DECLARE
  srv_id UUID;
  wf_id UUID;
BEGIN
  SELECT id INTO srv_id FROM services WHERE key = 'it_helpdesk';
  
  INSERT INTO workflows (service_id, name) VALUES (srv_id, 'مسار الدعم الفني الافتراضي') RETURNING id INTO wf_id;
  
  INSERT INTO workflow_steps (workflow_id, step_order, name, step_type, assigned_role) VALUES
  (wf_id, 1, 'مراجعة الطلب', 'اعتماد', 'مسؤول خدمة'),
  (wf_id, 2, 'تنفيذ الطلب', 'تنفيذ', 'مسؤول خدمة'),
  (wf_id, 3, 'إغلاق الطلب', 'تنفيذ', 'مسؤول خدمة');
END $$;

-- Seed Workflows (Example: Meeting Room)
DO $$
DECLARE
  srv_id UUID;
  wf_id UUID;
BEGIN
  SELECT id INTO srv_id FROM services WHERE key = 'meeting_room';
  
  INSERT INTO workflows (service_id, name) VALUES (srv_id, 'مسار حجز القاعات') RETURNING id INTO wf_id;
  
  INSERT INTO workflow_steps (workflow_id, step_order, name, step_type, assigned_role) VALUES
  (wf_id, 1, 'موافقة المدير المباشر', 'اعتماد', 'مدير'),
  (wf_id, 2, 'تأكيد الحجز', 'تنفيذ', 'مسؤول خدمة');
END $$;

-- Seed Service Forms (IT Helpdesk)
UPDATE service_forms SET schema_json = '{
  "fields": [
    { "key": "subject", "label": "عنوان المشكلة", "type": "text", "required": true },
    { "key": "details", "label": "وصف المشكلة بالتفصيل", "type": "textarea", "required": true },
    { "key": "pc_name", "label": "اسم الجهاز (إن وجد)", "type": "text", "required": false },
    { "key": "attachment", "label": "صورة للمشكلة", "type": "file", "required": false }
  ]
}' WHERE service_id = (SELECT id FROM services WHERE key = 'it_helpdesk');

-- Insert if not exists (simplified for seed)
INSERT INTO service_forms (service_id, schema_json) 
SELECT id, '{
  "fields": [
    { "key": "subject", "label": "عنوان المشكلة", "type": "text", "required": true },
    { "key": "details", "label": "وصف المشكلة بالتفصيل", "type": "textarea", "required": true }
  ]
}' FROM services WHERE key = 'it_helpdesk'
ON CONFLICT DO NOTHING;

-- Seed Users
INSERT INTO users (full_name, email, role, department) VALUES
('أحمد محمد', 'ahmed@rhf.org.bh', 'موظف', 'إدارة تقنية المعلومات'),
('خالد علي', 'khaled@rhf.org.bh', 'مسؤول خدمة', 'إدارة تقنية المعلومات'),
('سارة حسن', 'sara@rhf.org.bh', 'مدير', 'الموارد البشرية');
