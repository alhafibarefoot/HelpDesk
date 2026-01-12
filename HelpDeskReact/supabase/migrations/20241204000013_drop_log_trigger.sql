-- Drop the actual trigger that's causing the issue
DROP TRIGGER IF EXISTS trigger_log_request_creation ON requests CASCADE;

-- Drop the function
DROP FUNCTION IF EXISTS log_request_creation() CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Trigger trigger_log_request_creation and function log_request_creation() dropped successfully';
END $$;
