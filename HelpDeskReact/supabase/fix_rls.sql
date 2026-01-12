-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_form_values ENABLE ROW LEVEL SECURITY;

-- REQUESTS POLICIES

-- Allow users to view their own requests
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Allow users to insert their own requests
DROP POLICY IF EXISTS "Users can create requests" ON requests;
CREATE POLICY "Users can create requests" ON requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Allow admins/managers to view all requests (simplified for now, assumes 'admin' role check or tailored later)
-- For now, let's keep it simple. If you are a manager/admin you might need broad access.
-- We can add a policy later based on profiles.role.

-- REQUEST FORM VALUES POLICIES

-- Allow users to view form values for their requests
DROP POLICY IF EXISTS "Users can view own form values" ON request_form_values;
CREATE POLICY "Users can view own form values" ON request_form_values
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM requests 
            WHERE requests.id = request_form_values.request_id 
            AND requests.requester_id = auth.uid()
        )
    );

-- Allow users to insert form values for their requests
-- Check is tricky on INSERT because related row might strictly not exist if transaction isn't atomic view, 
-- but usually we check if the user OWNS the request id being referenced.
DROP POLICY IF EXISTS "Users can add form values" ON request_form_values;
CREATE POLICY "Users can add form values" ON request_form_values
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM requests 
            WHERE requests.id = request_form_values.request_id 
            AND requests.requester_id = auth.uid()
        )
    );
