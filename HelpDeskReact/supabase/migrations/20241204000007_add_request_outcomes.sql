-- Add outcome tracking to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('completed', 'rejected', 'cancelled', 'redirected', 'on_hold', 'expired')),
ADD COLUMN IF NOT EXISTS outcome_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for outcome queries
CREATE INDEX IF NOT EXISTS idx_requests_outcome ON requests(outcome);
CREATE INDEX IF NOT EXISTS idx_requests_completed_at ON requests(completed_at);

-- Function to auto-set completed_at when outcome is set
CREATE OR REPLACE FUNCTION set_request_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.outcome IS NOT NULL AND OLD.outcome IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set completed_at
DROP TRIGGER IF EXISTS trigger_set_completed_at ON requests;
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_completed_at();

-- Comments
COMMENT ON COLUMN requests.outcome IS 'Final outcome of the request: completed, rejected, cancelled, redirected, on_hold, or expired';
COMMENT ON COLUMN requests.outcome_reason IS 'Optional reason for the outcome';
COMMENT ON COLUMN requests.completed_at IS 'Timestamp when the request reached a final outcome';
