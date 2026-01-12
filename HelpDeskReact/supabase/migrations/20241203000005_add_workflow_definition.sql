-- Add definition column to workflows table
ALTER TABLE workflows 
ADD COLUMN IF NOT EXISTS definition JSONB;

-- Add comment
COMMENT ON COLUMN workflows.definition IS 'ReactFlow workflow definition (nodes and edges)';
