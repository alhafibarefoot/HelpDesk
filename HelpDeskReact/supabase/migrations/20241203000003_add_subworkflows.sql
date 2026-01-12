-- Add parent-child relationship to requests table
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS parent_request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_sub_workflow BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_requests_parent ON requests(parent_request_id);

-- Add sub-workflow metadata
COMMENT ON COLUMN requests.parent_request_id IS 'Reference to parent request if this is a sub-workflow';
COMMENT ON COLUMN requests.is_sub_workflow IS 'True if this request was created as part of a sub-workflow';
