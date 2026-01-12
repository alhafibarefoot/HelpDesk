-- Request Comments Table
-- Allows team members to discuss and collaborate on requests

CREATE TABLE IF NOT EXISTS request_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  
  -- Comment content
  comment_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Internal comments vs public
  
  -- Author
  author_id UUID,
  author_name TEXT NOT NULL,
  author_role TEXT,
  
  -- Mentions (@username)
  mentions UUID[], -- Array of user IDs mentioned
  
  -- Attachments
  attachments JSONB, -- [{ filename, url, size, type }]
  
  -- Threading (optional - for replies)
  parent_comment_id UUID REFERENCES request_comments(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false
);

-- Ensure columns exist (for idempotency)
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS comment_text TEXT NOT NULL;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS author_id UUID;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS author_role TEXT;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS mentions UUID[];
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES request_comments(id) ON DELETE CASCADE;
ALTER TABLE request_comments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_request ON request_comments(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON request_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON request_comments(parent_comment_id);

-- RLS Policies
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;

drop policy if exists "Allow all access to comments for development" on request_comments;
CREATE POLICY "Allow all access to comments for development"
  ON request_comments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_comment_timestamp ON request_comments;
CREATE TRIGGER trigger_update_comment_timestamp
  BEFORE UPDATE ON request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_timestamp();

-- Function to add comment to timeline
CREATE OR REPLACE FUNCTION add_comment_to_timeline()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add to timeline if not deleted
  IF NOT NEW.is_deleted THEN
    INSERT INTO request_timeline (
      request_id,
      event_type,
      event_title,
      event_description,
      actor_id,
      actor_name,
      actor_role,
      metadata
    ) VALUES (
      NEW.request_id,
      'commented',
      'تعليق جديد',
      CASE 
        WHEN NEW.is_internal THEN 'تعليق داخلي'
        ELSE 'تعليق عام'
      END,
      NEW.author_id,
      NEW.author_name,
      NEW.author_role,
      jsonb_build_object(
        'comment', LEFT(NEW.comment_text, 200),
        'comment_id', NEW.id,
        'is_internal', NEW.is_internal,
        'has_attachments', NEW.attachments IS NOT NULL
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add comments to timeline
DROP TRIGGER IF EXISTS trigger_comment_timeline ON request_comments;
CREATE TRIGGER trigger_comment_timeline
  AFTER INSERT ON request_comments
  FOR EACH ROW
  EXECUTE FUNCTION add_comment_to_timeline();

-- Comments
COMMENT ON TABLE request_comments IS 'Comments and discussions on requests';
COMMENT ON COLUMN request_comments.is_internal IS 'Internal comments visible only to team members';
COMMENT ON COLUMN request_comments.mentions IS 'Array of user IDs mentioned with @';
COMMENT ON COLUMN request_comments.attachments IS 'JSON array of attached files';
