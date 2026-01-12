-- Reusable Sub-Workflows Library

CREATE TABLE IF NOT EXISTS sub_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Sub-workflow info
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  
  -- Definition
  definition JSONB NOT NULL,
  
  -- Input/Output
  input_fields JSONB, -- Expected input parameters
  output_fields JSONB, -- Output parameters
  
  -- Metadata
  tags TEXT[],
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  
  -- Ownership
  created_by UUID,
  created_by_name TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist (for idempotency)
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS name_ar TEXT NOT NULL;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS category TEXT NOT NULL;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS definition JSONB NOT NULL;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS input_fields JSONB;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS output_fields JSONB;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE sub_workflows ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subworkflows_category ON sub_workflows(category);
CREATE INDEX IF NOT EXISTS idx_subworkflows_active ON sub_workflows(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subworkflows_tags ON sub_workflows USING GIN(tags);

-- RLS
ALTER TABLE sub_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sub-workflows for development"
  ON sub_workflows
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert common sub-workflows
INSERT INTO sub_workflows (
  name, name_ar, description_ar, category, definition, 
  input_fields, output_fields, tags, is_system
) VALUES
(
  'Manager Approval',
  'موافقة المدير',
  'موافقة بسيطة من المدير المباشر',
  'approval',
  '{"nodes":[{"id":"approval","type":"approval","data":{"label":"موافقة المدير","role":"مدير","sla_hours":24}}],"edges":[]}'::jsonb,
  '["request_id","request_data"]'::jsonb,
  '["approved","rejected","comments"]'::jsonb,
  ARRAY['approval', 'manager', 'simple'],
  true
),
(
  'Finance Check',
  'مراجعة مالية',
  'مراجعة وموافقة من قسم المالية',
  'finance',
  '{"nodes":[{"id":"review","type":"approval","data":{"label":"مراجعة المالية","role":"مالية","sla_hours":48}}],"edges":[]}'::jsonb,
  '["amount","budget_code"]'::jsonb,
  '["approved","budget_available","comments"]'::jsonb,
  ARRAY['finance', 'budget', 'approval'],
  true
),
(
  'Email Notification',
  'إشعار بريد إلكتروني',
  'إرسال إشعار بالبريد الإلكتروني',
  'notification',
  '{"nodes":[{"id":"email","type":"action","data":{"label":"إرسال بريد","action":"send_email"}}],"edges":[]}'::jsonb,
  '["recipient","subject","body"]'::jsonb,
  '["sent","message_id"]'::jsonb,
  ARRAY['notification', 'email', 'communication'],
  true
);

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_subworkflow_usage(subworkflow_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sub_workflows
  SET usage_count = usage_count + 1
  WHERE id = subworkflow_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE sub_workflows IS 'Reusable sub-workflow components library';
COMMENT ON COLUMN sub_workflows.input_fields IS 'Expected input parameters as JSON array';
COMMENT ON COLUMN sub_workflows.output_fields IS 'Output parameters as JSON array';
