-- Error Logs Table
-- Tracks all errors and retry attempts in workflow execution

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  
  -- Error details
  error_type TEXT NOT NULL CHECK (error_type IN (
    'network_error', 'api_timeout', 'validation_error',
    'integration_error', 'system_error', 'permission_error', 'data_error'
  )),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Retry information
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolution_method TEXT CHECK (resolution_method IN (
    'retry_success', 'fallback', 'manual', 'timeout'
  )),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_request ON error_logs(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_error_logs_retry ON error_logs(next_retry_at) WHERE NOT resolved AND next_retry_at IS NOT NULL;

-- RLS Policies
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

drop policy if exists "Allow all access to error logs for development" on error_logs;
CREATE POLICY "Allow all access to error logs for development"
  ON error_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_error_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_error_log_timestamp ON error_logs;
CREATE TRIGGER trigger_update_error_log_timestamp
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_log_timestamp();

-- Function to add error to timeline
CREATE OR REPLACE FUNCTION add_error_to_timeline()
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
    CASE 
      WHEN NEW.resolved THEN 'error_resolved'
      ELSE 'error_occurred'
    END,
    CASE 
      WHEN NEW.resolved THEN 'تم حل الخطأ'
      ELSE 'حدث خطأ'
    END,
    CASE 
      WHEN NEW.resolved THEN 'تم حل الخطأ: ' || NEW.error_message
      ELSE 'خطأ في الخطوة: ' || NEW.error_message
    END,
    'النظام',
    jsonb_build_object(
      'error_type', NEW.error_type,
      'retry_count', NEW.retry_count,
      'max_retries', NEW.max_retries,
      'resolved', NEW.resolved,
      'resolution_method', NEW.resolution_method
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add errors to timeline
-- Trigger to add errors to timeline
DROP TRIGGER IF EXISTS trigger_error_timeline_insert ON error_logs;
CREATE TRIGGER trigger_error_timeline_insert
  AFTER INSERT ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION add_error_to_timeline();

DROP TRIGGER IF EXISTS trigger_error_timeline_update ON error_logs;
CREATE TRIGGER trigger_error_timeline_update
  AFTER UPDATE ON error_logs
  FOR EACH ROW
  WHEN (NEW.resolved IS DISTINCT FROM OLD.resolved)
  EXECUTE FUNCTION add_error_to_timeline();

DROP TRIGGER IF EXISTS trigger_error_timeline ON error_logs;

-- Comments
COMMENT ON TABLE error_logs IS 'Comprehensive error logging with retry tracking';
COMMENT ON COLUMN error_logs.error_type IS 'Type of error that occurred';
COMMENT ON COLUMN error_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN error_logs.next_retry_at IS 'Scheduled time for next retry attempt';
COMMENT ON COLUMN error_logs.resolution_method IS 'How the error was resolved';
