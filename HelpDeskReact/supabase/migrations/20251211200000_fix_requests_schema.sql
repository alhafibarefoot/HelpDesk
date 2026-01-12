
-- Add updated_at column to requests table
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update the column to current timestamp for existing pending requests
UPDATE public.requests SET updated_at = created_at WHERE updated_at IS NULL;
