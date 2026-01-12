-- Create Service Status Enum (optional but good for consistency, using text check constraint here for simplicity)
ALTER TABLE services ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Add check constraint for valid statuses
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;
ALTER TABLE services ADD CONSTRAINT services_status_check 
    CHECK (status IN ('draft', 'active', 'suspended', 'maintenance'));

-- Migrate existing data: active services -> 'active', inactive -> 'draft'
UPDATE services SET status = 'active' WHERE is_active = true;
UPDATE services SET status = 'draft' WHERE is_active = false;

-- Comment on column
COMMENT ON COLUMN services.status IS 'Service lifecycle status: draft, active, suspended, maintenance';
