-- Fix the create_request_timeline_entry trigger to use correct column names
CREATE OR REPLACE FUNCTION create_request_timeline_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if request_timeline table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'request_timeline') THEN
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
      COALESCE('تم إنشاء طلب جديد', ''),
      NULL, -- No requester_id in current schema
      'النظام',
      jsonb_build_object(
        'service_id', NEW.service_id,
        'initial_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
