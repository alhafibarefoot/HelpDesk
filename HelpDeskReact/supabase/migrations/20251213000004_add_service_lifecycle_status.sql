-- Add status column to services table
ALTER TABLE public.services ADD COLUMN status TEXT DEFAULT 'draft';

-- Migrate existing data
UPDATE public.services SET status = 'active' WHERE is_active = true;
UPDATE public.services SET status = 'suspended' WHERE is_active = false;

-- Add check constraint
ALTER TABLE public.services ADD CONSTRAINT services_status_check CHECK (status IN ('draft', 'active', 'suspended', 'maintenance', 'archived'));

-- Create index for performance
CREATE INDEX idx_services_status ON public.services(status);
