-- Migration: Add Step Keys for Workflow Engine (Text-based IDs)

-- 1. Requests Table
ALTER TABLE requests ADD COLUMN current_step_key TEXT;
ALTER TABLE requests ADD CONSTRAINT check_requests_step_key_format CHECK (current_step_key ~ '^[a-zA-Z0-9_-]+$');
CREATE INDEX idx_requests_current_step_key ON requests(current_step_key);

-- 2. Request Active Steps
ALTER TABLE request_active_steps ADD COLUMN step_key TEXT;
ALTER TABLE request_active_steps ADD CONSTRAINT check_active_steps_step_key_format CHECK (step_key ~ '^[a-zA-Z0-9_-]+$');
CREATE INDEX idx_active_steps_step_key ON request_active_steps(step_key);

-- 3. Workflow Tasks
ALTER TABLE workflow_tasks ADD COLUMN step_key TEXT;
ALTER TABLE workflow_tasks ADD CONSTRAINT check_workflow_tasks_step_key_format CHECK (step_key ~ '^[a-zA-Z0-9_-]+$');
CREATE INDEX idx_workflow_tasks_step_key ON workflow_tasks(step_key);

-- 4. Request Actions (Audit)
ALTER TABLE request_actions ADD COLUMN from_step_key TEXT;
ALTER TABLE request_actions ADD COLUMN to_step_key TEXT;
ALTER TABLE request_actions ADD CONSTRAINT check_actions_from_key_format CHECK (from_step_key ~ '^[a-zA-Z0-9_-]+$');
ALTER TABLE request_actions ADD CONSTRAINT check_actions_to_key_format CHECK (to_step_key ~ '^[a-zA-Z0-9_-]+$');
CREATE INDEX idx_request_actions_from_step_key ON request_actions(from_step_key);
CREATE INDEX idx_request_actions_to_step_key ON request_actions(to_step_key);

-- 5. Workflow SLAs
ALTER TABLE workflow_slas ADD COLUMN step_key TEXT;
ALTER TABLE workflow_slas ADD CONSTRAINT check_slas_step_key_format CHECK (step_key ~ '^[a-zA-Z0-9_-]+$');
