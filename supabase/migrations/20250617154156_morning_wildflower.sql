/*
  # Create notification RPC functions

  1. Functions Created
    - `get_user_notifications` - Get paginated notifications for current user
    - `get_unread_notification_count` - Get count of unread notifications
    - `mark_notification_read` - Mark a specific notification as read
    - `mark_all_notifications_read` - Mark all notifications as read for current user
    - `delete_notification` - Delete a specific notification

  2. Security
    - All functions use auth.uid() to ensure users can only access their own data
    - Proper type handling for boolean values
*/

-- Function to get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  data JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.is_read,
    n.created_at,
    n.read_at
  FROM notifications n
  WHERE n.user_id = auth.uid()
    AND (NOT unread_only OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO unread_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
    
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE id = notification_id_param
    AND user_id = auth.uid()
    AND is_read = FALSE;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count > 0;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET 
    is_read = TRUE,
    read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Function to delete a notification
CREATE OR REPLACE FUNCTION delete_notification(notification_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE id = notification_id_param
    AND user_id = auth.uid();
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count > 0;
END;
$$;