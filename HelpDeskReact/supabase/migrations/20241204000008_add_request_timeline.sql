-- Request Timeline/History Table
-- Tracks all events and changes for each request

CREATE TABLE IF NOT EXISTS request_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL, -- 'created', 'status_changed', 'assigned', 'commented', 'attachment_added', 'escalated', 'sla_warning'
  event_title TEXT NOT NULL,
  event_description TEXT,
  
  -- Actor
  actor_id UUID, -- NULL for system events
  actor_name TEXT NOT NULL, -- Name of person or 'النظام' for automated
  actor_role TEXT,
  
  -- Changes (JSON for flexibility)
  changes JSONB, -- { "from": "old_value", "to": "new_value", "field": "status" }
  
  -- Metadata
  metadata JSONB, -- Additional data like attachment info, comment text, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexing
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'created', 'status_changed', 'assigned', 'reassigned',
    'commented', 'attachment_added', 'escalated', 
    'sla_warning', 'sla_overdue', 'approved', 'rejected',
    'step_completed', 'workflow_completed'
  ))
);

-- Ensure columns exist (for idempotency)
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS event_title TEXT NOT NULL;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS event_description TEXT;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS actor_name TEXT NOT NULL;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS changes JSONB;
ALTER TABLE request_timeline ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_request ON request_timeline(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_event_type ON request_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_actor ON request_timeline(actor_id);

-- RLS Policies (simplified for development)
ALTER TABLE request_timeline ENABLE ROW LEVEL SECURITY;

drop policy if exists "Allow all access to timeline for development" on request_timeline;
CREATE POLICY "Allow all access to timeline for development"
  ON request_timeline
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to automatically create timeline entry on request creation
CREATE OR REPLACE FUNCTION create_request_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO request_timeline (
    request_id,
    event_type,
    event_title,
    event_description,
    actor_id,
    actor_name,
    metadata
  ) VALUES (
    NEW.id,
    'created',
    'تم إنشاء الطلب',
    'تم إنشاء طلب جديد: ' || NEW.title,
    NEW.requester_id,
    'مقدم الطلب',
    jsonb_build_object(
      'service_key', NEW.service_key,
      'initial_status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create timeline entry
DROP TRIGGER IF EXISTS trigger_create_timeline ON requests;
CREATE TRIGGER trigger_create_timeline
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION create_request_timeline_entry();

-- Function to track status changes
CREATE OR REPLACE FUNCTION track_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO request_timeline (
      request_id,
      event_type,
      event_title,
      event_description,
      actor_name,
      changes
    ) VALUES (
      NEW.id,
      'status_changed',
      'تغيير الحالة',
      'تم تغيير حالة الطلب من "' || OLD.status || '" إلى "' || NEW.status || '"',
      'النظام',
      jsonb_build_object(
        'field', 'status',
        'from', OLD.status,
        'to', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to track status changes
DROP TRIGGER IF EXISTS trigger_track_status_change ON requests;
CREATE TRIGGER trigger_track_status_change
  AFTER UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION track_request_status_change();

-- Comments
COMMENT ON TABLE request_timeline IS 'Complete timeline/history of all events for each request';
COMMENT ON COLUMN request_timeline.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN request_timeline.changes IS 'JSON object showing what changed (from/to values)';
COMMENT ON COLUMN request_timeline.metadata IS 'Additional event-specific data';
