-- Add form_schema column to services table
-- This allows storing the form schema directly in the services table
-- instead of using a separate service_forms table

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS form_schema JSONB DEFAULT '{"fields": []}'::jsonb;

-- Migrate existing data from service_forms to services.form_schema
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_forms') THEN
    EXECUTE '
      UPDATE services s
      SET form_schema = sf.schema_json
      FROM service_forms sf
      WHERE s.id = sf.service_id
    ';
  END IF; 
END $$;

-- Add comment for documentation
COMMENT ON COLUMN services.form_schema IS 'JSON schema defining the form fields for this service';
