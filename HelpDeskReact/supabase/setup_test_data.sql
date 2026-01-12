-- 1. Link Users to form a Hierarchy
DO $$
DECLARE
  emp_id UUID;
  mgr_id UUID;
  adm_id UUID;
BEGIN
  -- Get IDs (Assuming seed_users.sql ran)
  SELECT id INTO emp_id FROM auth.users WHERE email = 'employee@test.com';
  SELECT id INTO mgr_id FROM auth.users WHERE email = 'manager@test.com';
  SELECT id INTO adm_id FROM auth.users WHERE email = 'admin@test.com';

  -- Update Profiles (public.users)
  -- Hierarchy: Admin <- Manager <- Employee
  -- Admin has NO manager (root)
  
  -- Manager reports to Admin
  UPDATE users SET direct_manager_id = adm_id WHERE id = mgr_id;
  
  -- Employee reports to Manager
  UPDATE users SET direct_manager_id = mgr_id WHERE id = emp_id;
  
  -- Ensure Admin has NULL manager
  UPDATE users SET direct_manager_id = NULL WHERE id = adm_id;
  
END $$;

-- 2. Create Test Service with Manager Chain Workflow
DO $$
DECLARE
  srv_id UUID;
  wf_id UUID;
BEGIN
  -- Create Service
  INSERT INTO services (key, name, description, is_active, status, form_schema)
  VALUES (
    'manager_chain_test', 
    'اختبار سلسلة المدراء', 
    'خدمة تجريبية لاختبار الموافقات المتسلسلة', 
    true, 
    'active',
    '{"fields": [{"key": "reason", "label": "السبب", "type": "text", "required": true}]}'::jsonb
  )
  ON CONFLICT (key) DO UPDATE SET is_active = true
  RETURNING id INTO srv_id;

  -- Create Workflow
  INSERT INTO workflows (service_id, name, is_active, definition)
  VALUES (
    srv_id, 
    'مسار الموافقات الإدارية', 
    true,
    jsonb_build_object(
      'nodes', jsonb_build_array(
        jsonb_build_object('id', 'start', 'type', 'start', 'position', jsonb_build_object('x', 0, 'y', 0)),
        jsonb_build_object(
          'id', 'step_manager', 
          'type', 'approval', 
          'data', jsonb_build_object('label', 'موافقة المدير المباشر', 'role', 'DIRECT_MANAGER'),
          'position', jsonb_build_object('x', 200, 'y', 0)
        ),
        jsonb_build_object(
          'id', 'step_director', 
          'type', 'approval', 
          'data', jsonb_build_object('label', 'موافقة المدير العام', 'role', 'MANAGER_LEVEL_2'),
          'position', jsonb_build_object('x', 400, 'y', 0)
        ),
        jsonb_build_object('id', 'end', 'type', 'end', 'position', jsonb_build_object('x', 600, 'y', 0))
      ),
      'edges', jsonb_build_array(
        jsonb_build_object('id', 'e1', 'source', 'start', 'target', 'step_manager'),
        jsonb_build_object('id', 'e2', 'source', 'step_manager', 'target', 'step_director'),
        jsonb_build_object('id', 'e3', 'source', 'step_director', 'target', 'end')
      )
    )
  )
  ON CONFLICT DO NOTHING; -- Crude, but okay for test setup
END $$;
