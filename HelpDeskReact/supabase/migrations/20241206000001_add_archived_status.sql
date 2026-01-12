-- Add 'archived' to valid service statuses
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;

ALTER TABLE services ADD CONSTRAINT services_status_check 
    CHECK (status IN ('draft', 'active', 'suspended', 'maintenance', 'archived'));
