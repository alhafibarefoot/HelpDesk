-- إضافة سياسات RLS للسماح للمسؤولين بإدارة الخدمات
-- نفذ هذا السكريبت في Supabase SQL Editor

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Allow admins to manage services" ON services;
DROP POLICY IF EXISTS "Allow everyone to view active services" ON services;
DROP POLICY IF EXISTS "Allow admins to manage workflows" ON workflows;

-- سياسة للسماح للجميع بقراءة الخدمات النشطة
CREATE POLICY "Allow everyone to view active services" ON services
    FOR SELECT
    USING (is_active = true OR status = 'active');

-- سياسة للسماح لأي مستخدم مسجل بإنشاء وتحديث الخدمات
-- (في الإنتاج، يجب تقييد هذا للمسؤولين فقط)
CREATE POLICY "Allow authenticated users to manage services" ON services
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- سياسة للسماح لأي مستخدم مسجل بإدارة سير العمل
CREATE POLICY "Allow authenticated users to manage workflows" ON workflows
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- التحقق من السياسات
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('services', 'workflows')
ORDER BY tablename, policyname;
