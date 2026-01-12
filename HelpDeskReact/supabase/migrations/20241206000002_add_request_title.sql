-- Add title column to requests table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'requests'
        AND column_name = 'title'
    ) THEN
        ALTER TABLE requests ADD COLUMN title TEXT;
    END IF;
END $$;
