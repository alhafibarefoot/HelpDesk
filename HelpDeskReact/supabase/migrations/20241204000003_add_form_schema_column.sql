-- Add form_schema column to services table
-- This allows storing the form schema directly in the services table

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS form_schema JSONB DEFAULT '{"fields": []}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN services.form_schema IS 'JSON schema defining the form fields for this service';
