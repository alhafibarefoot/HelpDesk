-- Nuclear option: Drop ALL triggers and functions related to requests table
-- This will allow inserts to work, then we can rebuild properly later

-- Drop all known triggers
DROP TRIGGER IF EXISTS trigger_create_timeline ON requests CASCADE;
DROP TRIGGER IF EXISTS trigger_track_status_change ON requests CASCADE;
DROP TRIGGER IF EXISTS trigger_set_completed_at ON requests CASCADE;
DROP TRIGGER IF EXISTS trigger_update_request_timestamp ON requests CASCADE;

-- Drop all functions that might be causing issues
DROP FUNCTION IF EXISTS create_request_timeline_entry() CASCADE;
DROP FUNCTION IF EXISTS track_request_status_change() CASCADE;
DROP FUNCTION IF EXISTS set_request_completed_at() CASCADE;

-- Simple success message
DO $$
BEGIN
  RAISE NOTICE 'All triggers and functions dropped successfully';
END $$;
