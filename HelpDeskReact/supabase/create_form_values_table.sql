CREATE TABLE IF NOT EXISTS request_form_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- لا تنسى تفعيل RLS بعد الإنشاء
ALTER TABLE request_form_values ENABLE ROW LEVEL SECURITY;

-- إعادة تطبيق السياسات (للتأكد)
DROP POLICY IF EXISTS "Users can view own form values" ON request_form_values;
CREATE POLICY "Users can view own form values" ON request_form_values
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM requests 
            WHERE requests.id = request_form_values.request_id 
            AND requests.requester_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can add form values" ON request_form_values;
CREATE POLICY "Users can add form values" ON request_form_values
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM requests 
            WHERE requests.id = request_form_values.request_id 
            AND requests.requester_id = auth.uid()
        )
    );
