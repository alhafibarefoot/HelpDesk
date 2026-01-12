-- إضافة عمود requester_id
ALTER TABLE requests ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES auth.users(id);

-- إضافة عمود priority
ALTER TABLE requests ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'متوسط';

-- التأكد من جدول القيم
CREATE TABLE IF NOT EXISTS request_form_values (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إعادة تفعيل RLS وتحديث الكاش
NOTIFY pgrst, 'reload config';

-- تفعيل RLS (فقط للتأكيد)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_form_values ENABLE ROW LEVEL SECURITY;

-- سياسات الطلبات
DROP POLICY IF EXISTS "Users can view own requests" ON requests;
CREATE POLICY "Users can view own requests" ON requests
    FOR SELECT USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can create requests" ON requests;
CREATE POLICY "Users can create requests" ON requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- سياسات القيم
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
