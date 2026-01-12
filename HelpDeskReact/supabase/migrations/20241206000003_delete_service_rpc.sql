-- Function to safely delete a service and all its dependencies
-- SECURITY DEFINER ensures it runs with admin privileges, bypassing RLS
CREATE OR REPLACE FUNCTION delete_service_safely(target_service_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    service_record RECORD;
    deleted_count INTEGER;
BEGIN
    -- 1. Check if service exists
    SELECT * INTO service_record FROM services WHERE id = target_service_id;
    
    IF service_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'الخدمة غير موجودة');
    END IF;

    -- 2. Check if active (we want to prevent deleting active services)
    -- Using both legacy boolean and status text for safety
    IF service_record.is_active = true OR service_record.status = 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'لا يمكن حذف خدمة نشطة. يرجى تعطيلها أولاً.');
    END IF;

    -- 3. Perform Deep Cleanup (Cascading Deletes)
    
    -- Delete requests and their children
    -- Note: If we rely on ON DELETE CASCADE, deleting requests is enough.
    -- But to be safe against missing cascades, we delete explicitly.
    
    -- Delete child tables linked to requests
    DELETE FROM request_form_values WHERE request_id IN (SELECT id FROM requests WHERE service_id = target_service_id);
    DELETE FROM request_timeline WHERE request_id IN (SELECT id FROM requests WHERE service_id = target_service_id);
    DELETE FROM request_comments WHERE request_id IN (SELECT id FROM requests WHERE service_id = target_service_id);
    
    -- Try deleting from optional tables if they exist
    BEGIN
        DELETE FROM escalation_history WHERE request_id IN (SELECT id FROM requests WHERE service_id = target_service_id);
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    BEGIN
        DELETE FROM error_logs WHERE request_id IN (SELECT id FROM requests WHERE service_id = target_service_id);
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Delete requests
    DELETE FROM requests WHERE service_id = target_service_id;

    -- Delete workflows
    DELETE FROM workflows WHERE service_id = target_service_id;
    
    -- Delete permissions/rules if valid
    BEGIN
        DELETE FROM escalation_rules WHERE service_key = service_record.key;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 4. Delete the service itself
    DELETE FROM services WHERE id = target_service_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'تم حذف الخدمة بنجاح');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
