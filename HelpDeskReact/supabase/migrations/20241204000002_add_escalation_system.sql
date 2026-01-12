-- Escalation Rules and History Tables

-- Escalation Rules Table
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_key TEXT,
  step_type TEXT,
  
  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('sla_warning', 'sla_overdue', 'no_action')),
  threshold_hours INTEGER NOT NULL,
  
  -- Escalation target
  escalate_to_role TEXT NOT NULL,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  auto_reassign BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist (for idempotency)
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS service_key TEXT;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS step_type TEXT;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS trigger_type TEXT  CHECK (trigger_type IN ('sla_warning', 'sla_overdue', 'no_action'));
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS threshold_hours INTEGER;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS escalate_to_role TEXT;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS notification_channels TEXT[] DEFAULT ARRAY['in_app'];
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS auto_reassign BOOLEAN DEFAULT false;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS auto_reassign BOOLEAN DEFAULT false;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS step_order INTEGER DEFAULT 1;
ALTER TABLE escalation_rules ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 0;

-- Escalation History Table
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  
  -- Escalation details
  from_user_id UUID,
  from_user_name TEXT,
  from_role TEXT,
  to_user_id UUID,
  to_user_name TEXT,
  to_role TEXT NOT NULL,
  
  -- Reason
  reason TEXT NOT NULL,
  escalation_level INTEGER DEFAULT 1,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  
  -- SLA info
  sla_hours INTEGER,
  elapsed_hours NUMERIC,
  overdue_hours NUMERIC,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist (for idempotency)
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS from_user_id UUID;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS from_user_name TEXT;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS from_role TEXT;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS to_user_id UUID;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS to_user_name TEXT;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS to_role TEXT;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 1;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS sla_hours INTEGER;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS elapsed_hours NUMERIC;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS overdue_hours NUMERIC;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE escalation_history ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalation_rules_service ON escalation_rules(service_key, step_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_escalation_history_request ON escalation_history(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escalation_history_unresolved ON escalation_history(resolved) WHERE NOT resolved;

-- RLS Policies
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

drop policy if exists "Allow all access to escalation rules for development" on escalation_rules;
CREATE POLICY "Allow all access to escalation rules for development"
  ON escalation_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

drop policy if exists "Allow all access to escalation history for development" on escalation_history;
CREATE POLICY "Allow all access to escalation history for development"
  ON escalation_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_escalation_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_escalation_rule_timestamp ON escalation_rules;
CREATE TRIGGER trigger_update_escalation_rule_timestamp
  BEFORE UPDATE ON escalation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_escalation_rule_timestamp();

-- Function to add escalation to timeline
CREATE OR REPLACE FUNCTION add_escalation_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO request_timeline (
    request_id,
    event_type,
    event_title,
    event_description,
    actor_name,
    metadata
  ) VALUES (
    NEW.request_id,
    'escalated',
    'تصعيد الطلب',
    'تم تصعيد الطلب من ' || COALESCE(NEW.from_role, 'غير محدد') || ' إلى ' || NEW.to_role,
    'النظام',
    jsonb_build_object(
      'from_role', NEW.from_role,
      'to_role', NEW.to_role,
      'reason', NEW.reason,
      'urgency', NEW.urgency,
      'escalation_level', NEW.escalation_level,
      'overdue_hours', NEW.overdue_hours
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add escalations to timeline
DROP TRIGGER IF EXISTS trigger_escalation_timeline ON escalation_history;
CREATE TRIGGER trigger_escalation_timeline
  AFTER INSERT ON escalation_history
  FOR EACH ROW
  EXECUTE FUNCTION add_escalation_to_timeline();

-- Insert default escalation rules
INSERT INTO escalation_rules (service_key, step_type, trigger_type, threshold_hours, escalate_to_role, auto_reassign, step_order, sla_hours)
VALUES 
  (NULL, 'approval', 'sla_overdue', 24, 'مدير', true, 1, 24),
  (NULL, 'action', 'sla_overdue', 48, 'مشرف', true, 1, 48)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE escalation_rules IS 'Rules for automatic escalation based on SLA';
COMMENT ON TABLE escalation_history IS 'History of all escalations that occurred';
COMMENT ON COLUMN escalation_history.urgency IS 'Urgency level: low, medium, high, critical';
COMMENT ON COLUMN escalation_history.escalation_level IS 'Level in escalation chain (1=first, 2=second, etc.)';
