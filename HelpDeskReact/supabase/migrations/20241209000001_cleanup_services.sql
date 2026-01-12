-- Delete all existing services and their workflows
-- This will cascade delete workflows, forms, and requests due to foreign key constraints

-- Delete all workflows first (optional, will be deleted automatically)
-- Explicitly delete requests first because FK might not cascade
DELETE FROM requests;
DELETE FROM workflows;

-- Delete all services
DELETE FROM services;

-- Reset sequences if needed (optional)
-- This ensures new services start with clean IDs
