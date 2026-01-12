-- التحقق من سياسات RLS وإصلاحها
-- نفذ هذا السكريبت في Supabase SQL Editor

-- 1. التحقق من السياسات الحالية
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('services', 'workflows')
ORDER BY tablename, policyname;

-- 2. حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Allow authenticated users to manage services" ON services;
DROP POLICY IF EXISTS "Allow everyone to view active services" ON services;
DROP POLICY IF EXISTS "Allow authenticated users to manage workflows" ON workflows;

-- 3. إنشاء سياسات جديدة أكثر تساهلاً (للتطوير فقط)
-- سياسة للسماح للجميع بقراءة الخدمات
CREATE POLICY "Public read services" ON services
    FOR SELECT
    TO public
    USING (true);

-- سياسة للسماح للمستخدمين المسجلين بإدارة الخدمات
CREATE POLICY "Authenticated manage services" ON services
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- سياسة للسماح للجميع بقراءة workflows
CREATE POLICY "Public read workflows" ON workflows
    FOR SELECT
    TO public
    USING (true);

-- سياسة للسماح للمستخدمين المسجلين بإدارة workflows
CREATE POLICY "Authenticated manage workflows" ON workflows
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. التحقق من النتيجة
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('services', 'workflows')
ORDER BY tablename, policyname;
