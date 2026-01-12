-- Force schema cache reload by altering the table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS _schema_reload_trigger BOOLEAN;
ALTER TABLE requests DROP COLUMN IF EXISTS _schema_reload_trigger;
