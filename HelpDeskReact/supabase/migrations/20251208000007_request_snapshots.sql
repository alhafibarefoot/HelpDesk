-- Add form_schema_snapshot to requests table
ALTER TABLE "public"."requests" 
ADD COLUMN IF NOT EXISTS "form_schema_snapshot" jsonb DEFAULT null;
