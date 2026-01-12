-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    type text NOT NULL, -- 'request_created', 'request_approved', 'request_rejected', 'request_sent_back', 'request_completed'
    title text NOT NULL,
    message text NOT NULL,
    entity_type text DEFAULT 'request',
    entity_id uuid REFERENCES public.requests(id) ON DELETE CASCADE,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Select: Users can see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Update: Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- 3. Security Definer Function for System Inserts
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text,
    p_entity_type text DEFAULT 'request',
    p_entity_id uuid DEFAULT NULL,
    p_link text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, entity_type, entity_id, link, metadata
    )
    VALUES (
        p_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id, p_link, p_metadata
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO service_role;
