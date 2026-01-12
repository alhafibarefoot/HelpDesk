-- Add escalation tracking to requests table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='requests' AND column_name='sla_due_at') THEN
        ALTER TABLE requests ADD COLUMN sla_due_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Create escalation_rules table
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL, -- Which workflow step this applies to
  sla_hours INTEGER NOT NULL, -- Hours before escalation
  reminder_hours INTEGER, -- Hours before SLA to send reminder (optional)
  escalate_to_role TEXT, -- Role to escalate to (e.g., 'مدير', 'مشرف')
  escalate_to_user_id UUID, -- Specific user UUID (optional)
  auto_approve BOOLEAN DEFAULT false, -- Auto-approve if overdue
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escalation_history table for audit
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL,
  from_user_id UUID, -- User who was assigned
  to_user_id UUID, -- User escalated to
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_requests_sla_due ON requests(sla_due_at) WHERE status NOT IN ('مكتمل', 'مرفوض', 'ملغي');
CREATE INDEX IF NOT EXISTS idx_escalation_rules_service ON escalation_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_request ON escalation_history(request_id);

-- Enable RLS
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for development)
-- Policies (simplified for development)
drop policy if exists "Allow all to view escalation rules" on escalation_rules;
CREATE POLICY "Allow all to view escalation rules"
  ON escalation_rules FOR SELECT
  USING (true);

drop policy if exists "Allow all to manage escalation rules" on escalation_rules;
CREATE POLICY "Allow all to manage escalation rules"
  ON escalation_rules FOR ALL
  USING (true)
  WITH CHECK (true);

drop policy if exists "Allow all to view escalation history" on escalation_history;
CREATE POLICY "Allow all to view escalation history"
  ON escalation_history FOR SELECT
  USING (true);

drop policy if exists "Allow all to insert escalation history" on escalation_history;
CREATE POLICY "Allow all to insert escalation history"
  ON escalation_history FOR INSERT
  WITH CHECK (true);
