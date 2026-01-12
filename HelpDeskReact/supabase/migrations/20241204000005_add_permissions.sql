-- Permissions System for Workflow Management

CREATE TABLE IF NOT EXISTS workflow_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Permission details
  role TEXT NOT NULL,
  permission_type TEXT NOT NULL CHECK (permission_type IN (
    'create_workflow',
    'edit_workflow',
    'delete_workflow',
    'publish_workflow',
    'view_workflow',
    'create_template',
    'use_template',
    'manage_users',
    'view_analytics'
  )),
  
  -- Scope
  service_key TEXT, -- NULL = all services
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO workflow_permissions (role, permission_type) VALUES
-- Admin - full access
('admin', 'create_workflow'),
('admin', 'edit_workflow'),
('admin', 'delete_workflow'),
('admin', 'publish_workflow'),
('admin', 'view_workflow'),
('admin', 'create_template'),
('admin', 'use_template'),
('admin', 'manage_users'),
('admin', 'view_analytics'),

-- Manager - can create and edit
('مدير', 'create_workflow'),
('مدير', 'edit_workflow'),
('مدير', 'view_workflow'),
('مدير', 'use_template'),
('مدير', 'view_analytics'),

-- Employee - view only
('موظف', 'view_workflow'),
('موظف', 'use_template');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_role ON workflow_permissions(role);
CREATE INDEX IF NOT EXISTS idx_permissions_type ON workflow_permissions(permission_type);

-- RLS
ALTER TABLE workflow_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to permissions for development"
  ON workflow_permissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE workflow_permissions IS 'Role-based permissions for workflow management';
COMMENT ON COLUMN workflow_permissions.service_key IS 'NULL means permission applies to all services';
