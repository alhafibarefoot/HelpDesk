-- Create workflow_branches table to track parallel execution
CREATE TABLE IF NOT EXISTS workflow_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  gateway_node_id TEXT NOT NULL, -- The ID of the gateway node that spawned this branch
  branch_node_id TEXT NOT NULL, -- The current node ID in this branch
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_branches_request ON workflow_branches(request_id);
CREATE INDEX IF NOT EXISTS idx_workflow_branches_status ON workflow_branches(status);

-- Enable RLS
ALTER TABLE workflow_branches ENABLE ROW LEVEL SECURITY;

-- Policies (simplified for development)
drop policy if exists "Allow all to view workflow branches" on workflow_branches;
CREATE POLICY "Allow all to view workflow branches"
  ON workflow_branches FOR SELECT
  USING (true);

drop policy if exists "Allow all to manage workflow branches" on workflow_branches;
CREATE POLICY "Allow all to manage workflow branches"
  ON workflow_branches FOR ALL
  USING (true)
  WITH CHECK (true);
