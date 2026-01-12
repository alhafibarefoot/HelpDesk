-- Workflow Templates System
-- Allows saving and reusing workflow designs

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Template info
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'hr', 'finance', 'it', 'procurement', 'general', 'custom'
  )),
  
  -- Template data
  definition JSONB NOT NULL, -- Same structure as workflows.definition
  thumbnail TEXT, -- Base64 or URL to preview image
  
  -- Metadata
  tags TEXT[], -- For search: ['approval', 'multi-step', 'escalation']
  complexity_score INTEGER DEFAULT 0,
  estimated_duration_hours INTEGER,
  
  -- Usage stats
  usage_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- Pre-built templates
  
  -- Ownership
  created_by UUID,
  created_by_name TEXT,
  organization_id UUID, -- For multi-tenant support
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- Share with other orgs
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Ensure columns exist (for idempotency)
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS name_ar TEXT NOT NULL;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS category TEXT NOT NULL;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS definition JSONB NOT NULL;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS complexity_score INTEGER DEFAULT 0;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS estimated_duration_hours INTEGER;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_templates_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON workflow_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_templates_system ON workflow_templates(is_system) WHERE is_system = true;
CREATE INDEX IF NOT EXISTS idx_templates_active ON workflow_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_tags ON workflow_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_templates_search ON workflow_templates USING GIN(to_tsvector('arabic', name_ar || ' ' || COALESCE(description_ar, '')));

-- RLS Policies
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

drop policy if exists "Allow all access to templates for development" on workflow_templates;
CREATE POLICY "Allow all access to templates for development"
  ON workflow_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_template_timestamp ON workflow_templates;
CREATE TRIGGER trigger_update_template_timestamp
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE workflow_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Insert pre-built templates
INSERT INTO workflow_templates (
  name, name_ar, description, description_ar, category, definition, tags, 
  complexity_score, estimated_duration_hours, is_system, is_featured, is_active
) VALUES 
(
  'Simple Approval',
  'موافقة بسيطة',
  'Basic approval workflow with one approver',
  'سير عمل موافقة بسيط مع موافق واحد',
  'general',
  '{"nodes":[{"id":"start","type":"start","position":{"x":250,"y":50},"data":{"label":"ابدأ"}},{"id":"approval","type":"approval","position":{"x":250,"y":150},"data":{"label":"موافقة المدير","role":"مدير","sla_hours":24}},{"id":"end","type":"end","position":{"x":250,"y":250},"data":{"label":"مكتمل","outcome":"completed"}}],"edges":[{"id":"e1","source":"start","target":"approval"},{"id":"e2","source":"approval","target":"end"}]}'::jsonb,
  ARRAY['approval', 'simple', 'one-step'],
  5,
  24,
  true,
  true,
  true
),
(
  'Multi-Level Approval',
  'موافقة متعددة المستويات',
  'Approval workflow with multiple levels (Employee → Manager → Director)',
  'سير عمل موافقة متعدد المستويات (موظف ← مدير ← مدير عام)',
  'general',
  '{"nodes":[{"id":"start","type":"start","position":{"x":250,"y":50},"data":{"label":"ابدأ"}},{"id":"approval1","type":"approval","position":{"x":250,"y":150},"data":{"label":"موافقة المدير","role":"مدير","sla_hours":24}},{"id":"approval2","type":"approval","position":{"x":250,"y":250},"data":{"label":"موافقة المدير العام","role":"مدير عام","sla_hours":48}},{"id":"end","type":"end","position":{"x":250,"y":350},"data":{"label":"مكتمل","outcome":"completed"}}],"edges":[{"id":"e1","source":"start","target":"approval1"},{"id":"e2","source":"approval1","target":"approval2"},{"id":"e3","source":"approval2","target":"end"}]}'::jsonb,
  ARRAY['approval', 'multi-level', 'escalation'],
  10,
  72,
  true,
  true,
  true
),
(
  'Leave Request',
  'طلب إجازة',
  'Employee leave request with manager approval',
  'طلب إجازة موظف مع موافقة المدير',
  'hr',
  '{"nodes":[{"id":"start","type":"start","position":{"x":250,"y":50},"data":{"label":"ابدأ"}},{"id":"form","type":"form","position":{"x":250,"y":150},"data":{"label":"تفاصيل الإجازة","fields":["نوع الإجازة","تاريخ البداية","تاريخ النهاية","السبب"]}},{"id":"approval","type":"approval","position":{"x":250,"y":250},"data":{"label":"موافقة المدير","role":"مدير","sla_hours":24}},{"id":"end","type":"end","position":{"x":250,"y":350},"data":{"label":"مكتمل","outcome":"completed"}}],"edges":[{"id":"e1","source":"start","target":"form"},{"id":"e2","source":"form","target":"approval"},{"id":"e3","source":"approval","target":"end"}]}'::jsonb,
  ARRAY['hr', 'leave', 'approval', 'form'],
  8,
  24,
  true,
  true,
  true
),
(
  'Purchase Request',
  'طلب شراء',
  'Purchase request with budget approval',
  'طلب شراء مع موافقة الميزانية',
  'procurement',
  '{"nodes":[{"id":"start","type":"start","position":{"x":250,"y":50},"data":{"label":"ابدأ"}},{"id":"form","type":"form","position":{"x":250,"y":150},"data":{"label":"تفاصيل الشراء"}},{"id":"gateway","type":"gateway","position":{"x":250,"y":250},"data":{"label":"OR"}},{"id":"approval1","type":"approval","position":{"x":150,"y":350},"data":{"label":"موافقة المدير","role":"مدير","sla_hours":24}},{"id":"approval2","type":"approval","position":{"x":350,"y":350},"data":{"label":"موافقة المالية","role":"مالية","sla_hours":48}},{"id":"join","type":"join","position":{"x":250,"y":450},"data":{"label":"تجميع"}},{"id":"end","type":"end","position":{"x":250,"y":550},"data":{"label":"مكتمل","outcome":"completed"}}],"edges":[{"id":"e1","source":"start","target":"form"},{"id":"e2","source":"form","target":"gateway"},{"id":"e3","source":"gateway","target":"approval1"},{"id":"e4","source":"gateway","target":"approval2"},{"id":"e5","source":"approval1","target":"join"},{"id":"e6","source":"approval2","target":"join"},{"id":"e7","source":"join","target":"end"}]}'::jsonb,
  ARRAY['procurement', 'purchase', 'parallel', 'gateway'],
  15,
  72,
  true,
  true,
  true
),
(
  'IT Support Ticket',
  'تذكرة دعم فني',
  'IT support ticket workflow with escalation',
  'سير عمل تذكرة دعم فني مع تصعيد',
  'it',
  '{"nodes":[{"id":"start","type":"start","position":{"x":250,"y":50},"data":{"label":"ابدأ"}},{"id":"form","type":"form","position":{"x":250,"y":150},"data":{"label":"تفاصيل المشكلة"}},{"id":"action1","type":"action","position":{"x":250,"y":250},"data":{"label":"تعيين للفني","role":"فني","sla_hours":4}},{"id":"action2","type":"action","position":{"x":250,"y":350},"data":{"label":"حل المشكلة","role":"فني","sla_hours":24}},{"id":"end","type":"end","position":{"x":250,"y":450},"data":{"label":"محلول","outcome":"completed"}}],"edges":[{"id":"e1","source":"start","target":"form"},{"id":"e2","source":"form","target":"action1"},{"id":"e3","source":"action1","target":"action2"},{"id":"e4","source":"action2","target":"end"}]}'::jsonb,
  ARRAY['it', 'support', 'ticket', 'escalation'],
  12,
  28,
  true,
  true,
  true
);

-- Comments
COMMENT ON TABLE workflow_templates IS 'Reusable workflow templates library';
COMMENT ON COLUMN workflow_templates.definition IS 'Complete workflow definition (nodes + edges)';
COMMENT ON COLUMN workflow_templates.is_system IS 'Pre-built system templates (cannot be deleted)';
COMMENT ON COLUMN workflow_templates.is_featured IS 'Featured templates shown first';
COMMENT ON COLUMN workflow_templates.complexity_score IS 'Calculated complexity (same as workflow analytics)';
