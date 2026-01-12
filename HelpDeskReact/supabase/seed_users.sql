-- تفعيل إضافة التشفير إذا لم تكن مفعلة
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- دالة مساعدة لإنشاء مستخدم بسرعة
CREATE OR REPLACE FUNCTION create_test_user(
    user_email text, 
    user_password text, 
    user_role text, 
    user_full_name text
) RETURNS void AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- التحقق مما إذا كان المستخدم موجوداً
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    RETURN;
  END IF;

  -- إنشاء المعرف
  new_user_id := gen_random_uuid();

  -- إضافة المستخدم إلى جدول المصادقة
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')), -- تشفير كلمة المرور
    now(), -- تأكيد فوري
    '{"provider": "email", "providers": ["email"]}',
    json_build_object('full_name', user_full_name, 'role', user_role),
    now(),
    now()
  );

  -- إضافة الهوية (ضروري لتسجيل الدخول)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    json_build_object('sub', new_user_id, 'email', user_email),
    'email',
    now(),
    now(),
    now()
  );
END;
$$ LANGUAGE plpgsql;

-- --- تنفيذ إنشاء المستخدمين ---

SELECT create_test_user('employee@test.com', 'password123', 'user', 'أحمد الموظف');
SELECT create_test_user('manager@test.com', 'password123', 'manager', 'خالد المدير');
SELECT create_test_user('admin@test.com', 'password123', 'admin', 'سارة المسؤول');

-- حذف الدالة بعد الانتهاء لتنظيف المكان (اختياري)
DROP FUNCTION create_test_user(text, text, text, text);
