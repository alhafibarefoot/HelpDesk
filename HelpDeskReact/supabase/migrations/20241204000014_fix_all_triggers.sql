-- Drop all triggers on requests table
DROP TRIGGER IF EXISTS trigger_create_timeline ON requests;
DROP TRIGGER IF EXISTS trigger_track_status_change ON requests;
DROP TRIGGER IF EXISTS trigger_set_completed_at ON requests;

-- Recreate the create_request_timeline_entry function without problematic fields
CREATE OR REPLACE FUNCTION create_request_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if request_timeline table exists before inserting
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'request_timeline') THEN
    BEGIN
      INSERT INTO request_timeline (
        request_id,
        event_type,
        event_title,
        event_description,
        actor_name,
        metadata
      ) VALUES (
        NEW.id,
        'created',
        'تم إنشاء الطلب',
        'تم إنشاء طلب جديد',
        'النظام',
        jsonb_build_object(
          'service_id', NEW.service_id,
          'request_number', NEW.request_number
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore errors to prevent blocking inserts
      NULL;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_create_timeline
  AFTER INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION create_request_timeline_entry();
