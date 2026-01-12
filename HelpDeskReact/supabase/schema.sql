-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS (Arabic)
CREATE TYPE user_role AS ENUM ('موظف', 'مسؤول خدمة', 'مدير', 'مشرف');
CREATE TYPE service_status AS ENUM ('جديد', 'قيد المراجعة', 'قيد التنفيذ', 'موقوف', 'مكتمل', 'مرفوض', 'ملغي', 'متأخر');
CREATE TYPE request_priority AS ENUM ('منخفض', 'متوسط', 'مرتفع', 'عاجل');
CREATE TYPE step_type AS ENUM ('اعتماد', 'تنفيذ', 'إشعار');
CREATE TYPE action_type AS ENUM ('إنشاء', 'إرسال', 'اعتماد', 'رفض', 'تنفيذ', 'تحديث', 'إغلاق', 'إلغاء');

-- USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'موظف',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SERVICES
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owning_department TEXT,
  default_sla_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SERVICE FORMS (JSON Schema)
CREATE TABLE service_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  schema_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORKFLOWS
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WORKFLOW STEPS
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  step_type step_type NOT NULL,
  assigned_role TEXT, -- 'مسؤول خدمة', 'مدير', or specific role
  assigned_department TEXT, -- Optional, for routing
  requires_all_approvers BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REQUESTS
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL, -- SRV-2025-0001
  service_id UUID REFERENCES services(id),
  requester_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status service_status DEFAULT 'جديد',
  priority request_priority DEFAULT 'متوسط',
  department TEXT, -- Requester's department snapshot
  current_step_id UUID REFERENCES workflow_steps(id),
  sla_due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REQUEST FORM VALUES
CREATE TABLE request_form_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REQUEST ACTIONS (Audit Log)
CREATE TABLE request_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  action_type action_type NOT NULL,
  from_step_id UUID REFERENCES workflow_steps(id),
  to_step_id UUID REFERENCES workflow_steps(id),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REQUEST ATTACHMENTS
CREATE TABLE request_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Basic)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone for now (for development)
CREATE POLICY "Allow public read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON services FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON requests FOR SELECT USING (true);
