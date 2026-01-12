-- Fix permissions for Delivery Service Workflow (04290c01-99ed-4ca2-8e70-cd4f918758dc)
-- Correcting for schema: visible (bool), editable (bool), allowed_roles (jsonb)

DO $$
DECLARE
    wf_id UUID := '04290c01-99ed-4ca2-8e70-cd4f918758dc';
BEGIN
    -- Clear existing permissions for this workflow to avoid duplicates
    DELETE FROM step_field_permissions WHERE workflow_id = wf_id;

    -- 1. Start Step (Node 1: 'create') - All fields editable
    -- Note: 'create' permissions usually handled effectively by the "New Request" context, 
    -- but if we return to this step, we need permissions.
    INSERT INTO step_field_permissions (workflow_id, step_id, field_key, visible, editable, allowed_roles) VALUES
    (wf_id, '1', 'description', true, true, NULL),
    (wf_id, '1', 'pickup_location', true, true, NULL),
    (wf_id, '1', 'dropoff_location', true, true, NULL),
    (wf_id, '1', 'delivery_datetime', true, true, NULL),
    (wf_id, '1', 'delivery_type', true, true, NULL),
    (wf_id, '1', 'priority', true, true, NULL),
    (wf_id, '1', 'executing_department', true, true, NULL),
    (wf_id, '1', 'additional_notes', true, true, NULL),
    (wf_id, '1', 'service_rating', false, false, NULL), -- Initial step: hide feedback
    (wf_id, '1', 'service_feedback', false, false, NULL);

    -- 2. Approval Step (Node 2: 'approval') - Manager Review
    -- Manager sees everything read-only, feedback hidden.
    INSERT INTO step_field_permissions (workflow_id, step_id, field_key, visible, editable, allowed_roles) VALUES
    (wf_id, '2', 'description', true, false, NULL),
    (wf_id, '2', 'pickup_location', true, false, NULL),
    (wf_id, '2', 'dropoff_location', true, false, NULL),
    (wf_id, '2', 'delivery_datetime', true, false, NULL),
    (wf_id, '2', 'delivery_type', true, false, NULL),
    (wf_id, '2', 'priority', true, false, NULL),
    (wf_id, '2', 'executing_department', true, false, NULL),
    (wf_id, '2', 'additional_notes', true, false, NULL),
    (wf_id, '2', 'service_rating', false, false, NULL),
    (wf_id, '2', 'service_feedback', false, false, NULL);

    -- 3. Execution Step (Node 3: 'task') - Logistics/Security executing
    -- Read-only main fields.
    INSERT INTO step_field_permissions (workflow_id, step_id, field_key, visible, editable, allowed_roles) VALUES
    (wf_id, '3', 'description', true, false, NULL),
    (wf_id, '3', 'pickup_location', true, false, NULL),
    (wf_id, '3', 'dropoff_location', true, false, NULL),
    (wf_id, '3', 'delivery_datetime', true, false, NULL),
    (wf_id, '3', 'delivery_type', true, false, NULL),
    (wf_id, '3', 'priority', true, false, NULL),
    (wf_id, '3', 'executing_department', true, false, NULL),
    (wf_id, '3', 'additional_notes', true, false, NULL),
    (wf_id, '3', 'service_rating', false, false, NULL),
    (wf_id, '3', 'service_feedback', false, false, NULL);

    -- 4. Feedback Step (Node 4: 'task') - Requester providing feedback
    -- This is the CRITICAL FIX.
    -- Main fields: Read-only
    -- Feedback fields: Writable
    INSERT INTO step_field_permissions (workflow_id, step_id, field_key, visible, editable, allowed_roles) VALUES
    (wf_id, '4', 'description', true, false, NULL),
    (wf_id, '4', 'pickup_location', true, false, NULL),
    (wf_id, '4', 'dropoff_location', true, false, NULL),
    (wf_id, '4', 'delivery_datetime', true, false, NULL),
    (wf_id, '4', 'delivery_type', true, false, NULL),
    (wf_id, '4', 'priority', true, false, NULL),
    (wf_id, '4', 'executing_department', true, false, NULL),
    (wf_id, '4', 'additional_notes', true, false, NULL),
    -- ENABLE FEEDBACK FORM
    (wf_id, '4', 'service_rating', true, true, NULL),
    (wf_id, '4', 'service_feedback', true, true, NULL);

END $$;
