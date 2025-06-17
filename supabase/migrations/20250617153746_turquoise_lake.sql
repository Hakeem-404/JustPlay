/*
  # Notification System

  1. New Tables
    - `notifications` - Stores user notifications
    - `notification_preferences` - Stores user notification settings
  
  2. Functions
    - Functions for creating, reading, and managing notifications
    - Functions for notification preferences
    - Trigger functions for various notification types
  
  3. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('game_invitation', 'player_joined', 'game_cancelled', 'chat_message', 'waitlist_promotion', 'game_reminder', 'friend_request', 'friend_accepted', 'game_rating', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  game_invitations boolean DEFAULT true,
  game_updates boolean DEFAULT true,
  chat_messages boolean DEFAULT true,
  friend_requests boolean DEFAULT true,
  game_reminders boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for notifications - Check if they exist first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications'
  ) THEN
    CREATE POLICY "Users can delete their own notifications"
      ON notifications
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Policies for notification_preferences - Check if they exist first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can view their own notification preferences'
  ) THEN
    CREATE POLICY "Users can view their own notification preferences"
      ON notification_preferences
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can update their own notification preferences'
  ) THEN
    CREATE POLICY "Users can update their own notification preferences"
      ON notification_preferences
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert their own notification preferences'
  ) THEN
    CREATE POLICY "Users can insert their own notification preferences"
      ON notification_preferences
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  user_id_param uuid,
  type_param text,
  title_param text,
  message_param text,
  data_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
  user_preferences notification_preferences%ROWTYPE;
BEGIN
  -- Get user preferences
  SELECT * INTO user_preferences
  FROM notification_preferences
  WHERE user_id = user_id_param;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (user_id_param)
    RETURNING * INTO user_preferences;
  END IF;
  
  -- Check if this notification type is enabled
  IF (
    (type_param = 'game_invitation' AND user_preferences.game_invitations) OR
    (type_param IN ('player_joined', 'game_cancelled', 'waitlist_promotion') AND user_preferences.game_updates) OR
    (type_param = 'chat_message' AND user_preferences.chat_messages) OR
    (type_param IN ('friend_request', 'friend_accepted') AND user_preferences.friend_requests) OR
    (type_param = 'game_reminder' AND user_preferences.game_reminders) OR
    (type_param = 'system') OR
    (type_param = 'game_rating')
  ) THEN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (user_id_param, type_param, title_param, message_param, data_param)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
  ELSE
    -- Notification type is disabled by user preferences
    RETURN NULL;
  END IF;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id_param AND user_id = auth.uid();
  
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Function to delete notification
CREATE OR REPLACE FUNCTION delete_notification(notification_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  success boolean;
BEGIN
  DELETE FROM notifications
  WHERE id = notification_id_param AND user_id = auth.uid();
  
  GET DIAGNOSTICS success = ROW_COUNT;
  
  RETURN success > 0;
END;
$$;

-- Function to get user notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
  limit_param integer DEFAULT 20,
  offset_param integer DEFAULT 0,
  unread_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  type text,
  title text,
  message text,
  data jsonb,
  is_read boolean,
  created_at timestamptz,
  read_at timestamptz
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
    AND (NOT unread_only OR n.is_read = false)
  ORDER BY n.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = false;
  
  RETURN unread_count;
END;
$$;

-- Function to create game-related notifications
CREATE OR REPLACE FUNCTION create_game_notification(
  game_id_param uuid,
  notification_type text,
  user_ids uuid[],
  title_param text,
  message_param text,
  additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game_data games%ROWTYPE;
  user_id uuid;
  notification_count integer := 0;
  notification_data jsonb;
BEGIN
  -- Get game data
  SELECT * INTO game_data FROM games WHERE id = game_id_param;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Prepare notification data
  notification_data = jsonb_build_object(
    'game_id', game_id_param,
    'game_title', COALESCE(game_data.title, game_data.sport),
    'game_sport', game_data.sport,
    'game_date', game_data.date,
    'game_time', game_data.time,
    'game_location', game_data.location
  ) || additional_data;
  
  -- Create notification for each user
  FOREACH user_id IN ARRAY user_ids
  LOOP
    PERFORM create_notification(
      user_id,
      notification_type,
      title_param,
      message_param,
      notification_data
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  RETURN notification_count;
END;
$$;

-- Trigger function to create notifications for game status changes
CREATE OR REPLACE FUNCTION notify_game_status_change()
RETURNS TRIGGER AS $$
DECLARE
  participant_ids uuid[];
  organizer_name text;
BEGIN
  -- Only proceed if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get organizer name
  SELECT name INTO organizer_name FROM profiles WHERE id = NEW.organizer_id;
  
  -- Get all participants
  SELECT array_agg(user_id) INTO participant_ids
  FROM game_participants
  WHERE game_id = NEW.id AND status IN ('joined', 'waitlist');
  
  -- If no participants, return
  IF participant_ids IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Create appropriate notifications based on status change
  IF NEW.status = 'cancelled' THEN
    -- Game cancelled notification
    PERFORM create_game_notification(
      NEW.id,
      'game_cancelled',
      participant_ids,
      'Game Cancelled',
      COALESCE(NEW.title, NEW.sport) || ' on ' || NEW.date || ' has been cancelled by the organizer.',
      jsonb_build_object('organizer_id', NEW.organizer_id, 'organizer_name', organizer_name)
    );
  ELSIF NEW.status = 'completed' THEN
    -- Game completed notification
    PERFORM create_game_notification(
      NEW.id,
      'game_rating',
      participant_ids,
      'Rate Your Experience',
      'Your ' || NEW.sport || ' game has been marked as completed. Please rate the other players!',
      jsonb_build_object('organizer_id', NEW.organizer_id, 'organizer_name', organizer_name)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for game status changes - Drop first if exists
DROP TRIGGER IF EXISTS game_status_change_notification ON games;
CREATE TRIGGER game_status_change_notification
  AFTER UPDATE OF status ON games
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_status_change();

-- Trigger function to create notifications for new participants
CREATE OR REPLACE FUNCTION notify_participant_joined()
RETURNS TRIGGER AS $$
DECLARE
  game_data games%ROWTYPE;
  participant_name text;
  organizer_id uuid;
BEGIN
  -- Only proceed if this is a new join (not from waitlist to joined)
  IF TG_OP = 'UPDATE' AND OLD.status = 'waitlist' AND NEW.status = 'joined' THEN
    -- This is a waitlist promotion, handle separately
    SELECT * INTO game_data FROM games WHERE id = NEW.game_id;
    SELECT name INTO participant_name FROM profiles WHERE id = NEW.user_id;
    
    -- Notify the promoted user
    PERFORM create_notification(
      NEW.user_id,
      'waitlist_promotion',
      'You''ve been promoted from waitlist!',
      'You''ve been moved from the waitlist to a confirmed spot in ' || COALESCE(game_data.title, game_data.sport) || ' on ' || game_data.date || '.',
      jsonb_build_object(
        'game_id', game_data.id,
        'game_title', COALESCE(game_data.title, game_data.sport),
        'game_sport', game_data.sport,
        'game_date', game_data.date,
        'game_time', game_data.time,
        'game_location', game_data.location
      )
    );
    
    RETURN NEW;
  END IF;
  
  -- Get game data
  SELECT * INTO game_data FROM games WHERE id = NEW.game_id;
  
  -- Get participant name
  SELECT name INTO participant_name FROM profiles WHERE id = NEW.user_id;
  
  -- Notify game organizer about new participant
  PERFORM create_notification(
    game_data.organizer_id,
    'player_joined',
    'New Player Joined Your Game',
    participant_name || ' has joined your ' || game_data.sport || ' game on ' || game_data.date || '.',
    jsonb_build_object(
      'game_id', game_data.id,
      'game_title', COALESCE(game_data.title, game_data.sport),
      'game_sport', game_data.sport,
      'game_date', game_data.date,
      'game_time', game_data.time,
      'player_id', NEW.user_id,
      'player_name', participant_name,
      'status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new participants - Drop first if exists
DROP TRIGGER IF EXISTS participant_joined_notification ON game_participants;
CREATE TRIGGER participant_joined_notification
  AFTER INSERT OR UPDATE OF status ON game_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_participant_joined();

-- Trigger function to create notifications for new friend requests
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name text;
BEGIN
  -- Get requester name
  SELECT name INTO requester_name FROM profiles WHERE id = NEW.requester_id;
  
  -- Create notification for addressee
  PERFORM create_notification(
    NEW.addressee_id,
    'friend_request',
    'New Friend Request',
    requester_name || ' sent you a friend request.',
    jsonb_build_object(
      'friendship_id', NEW.id,
      'requester_id', NEW.requester_id,
      'requester_name', requester_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new friend requests - Drop first if exists
DROP TRIGGER IF EXISTS friend_request_notification ON friendships;
CREATE TRIGGER friend_request_notification
  AFTER INSERT ON friendships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_friend_request();

-- Trigger function to create notifications for accepted friend requests
CREATE OR REPLACE FUNCTION notify_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  addressee_name text;
BEGIN
  -- Only proceed if status changed from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Get addressee name
    SELECT name INTO addressee_name FROM profiles WHERE id = NEW.addressee_id;
    
    -- Create notification for requester
    PERFORM create_notification(
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      addressee_name || ' accepted your friend request.',
      jsonb_build_object(
        'friendship_id', NEW.id,
        'friend_id', NEW.addressee_id,
        'friend_name', addressee_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for accepted friend requests - Drop first if exists
DROP TRIGGER IF EXISTS friend_accepted_notification ON friendships;
CREATE TRIGGER friend_accepted_notification
  AFTER UPDATE OF status ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION notify_friend_accepted();

-- Trigger function to create notifications for new private messages
CREATE OR REPLACE FUNCTION notify_private_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
  conversation_data conversations%ROWTYPE;
BEGIN
  -- Get sender name
  SELECT name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Get conversation data
  SELECT * INTO conversation_data FROM conversations WHERE id = NEW.conversation_id;
  
  -- Create notification for recipient
  PERFORM create_notification(
    NEW.recipient_id,
    'chat_message',
    'New Message from ' || sender_name,
    substring(NEW.content, 1, 50) || CASE WHEN length(NEW.content) > 50 THEN '...' ELSE '' END,
    jsonb_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'sender_id', NEW.sender_id,
      'sender_name', sender_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new private messages - Drop first if exists
DROP TRIGGER IF EXISTS private_message_notification ON private_messages;
CREATE TRIGGER private_message_notification
  AFTER INSERT ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_private_message();

-- Trigger function to create notifications for new game messages
CREATE OR REPLACE FUNCTION notify_game_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
  game_data games%ROWTYPE;
  participant_ids uuid[];
BEGIN
  -- Skip system messages
  IF NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;
  
  -- Get sender name
  SELECT name INTO sender_name FROM profiles WHERE id = NEW.user_id;
  
  -- Get game data
  SELECT * INTO game_data FROM games WHERE id = NEW.game_id;
  
  -- Get all participants except sender
  SELECT array_agg(user_id) INTO participant_ids
  FROM game_participants
  WHERE game_id = NEW.game_id 
    AND status IN ('joined', 'waitlist')
    AND user_id != NEW.user_id;
  
  -- Add organizer if not the sender
  IF game_data.organizer_id != NEW.user_id THEN
    participant_ids := array_append(participant_ids, game_data.organizer_id);
  END IF;
  
  -- If no recipients, return
  IF participant_ids IS NULL OR array_length(participant_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Create notification for all participants
  PERFORM create_game_notification(
    NEW.game_id,
    'chat_message',
    participant_ids,
    'New message in ' || COALESCE(game_data.title, game_data.sport),
    sender_name || ': ' || substring(NEW.content, 1, 50) || CASE WHEN length(NEW.content) > 50 THEN '...' ELSE '' END,
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.user_id,
      'sender_name', sender_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new game messages - Drop first if exists
DROP TRIGGER IF EXISTS game_message_notification ON game_messages;
CREATE TRIGGER game_message_notification
  AFTER INSERT ON game_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_message();

-- Trigger function to create notifications for new game ratings
CREATE OR REPLACE FUNCTION notify_game_rating()
RETURNS TRIGGER AS $$
DECLARE
  rater_name text;
  game_data games%ROWTYPE;
BEGIN
  -- Get rater name
  SELECT name INTO rater_name FROM profiles WHERE id = NEW.rater_id;
  
  -- Get game data
  SELECT * INTO game_data FROM games WHERE id = NEW.game_id;
  
  -- Create notification for rated user
  PERFORM create_notification(
    NEW.rated_id,
    'game_rating',
    'New Rating Received',
    rater_name || ' rated you ' || NEW.rating || ' stars for the ' || game_data.sport || ' game on ' || game_data.date || '.',
    jsonb_build_object(
      'game_id', NEW.game_id,
      'game_title', COALESCE(game_data.title, game_data.sport),
      'game_sport', game_data.sport,
      'game_date', game_data.date,
      'rater_id', NEW.rater_id,
      'rater_name', rater_name,
      'rating', NEW.rating
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new game ratings - Drop first if exists
DROP TRIGGER IF EXISTS game_rating_notification ON game_ratings;
CREATE TRIGGER game_rating_notification
  AFTER INSERT ON game_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_game_rating();

-- Function to schedule game reminders
CREATE OR REPLACE FUNCTION schedule_game_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  upcoming_game RECORD;
  participant_ids uuid[];
  reminder_count integer := 0;
  game_start_time timestamptz;
  current_time timestamptz := now();
  reminder_window_start timestamptz;
  reminder_window_end timestamptz;
BEGIN
  -- Look for games starting in the next 30-35 minutes
  -- This function would be called every 5 minutes by a cron job
  
  FOR upcoming_game IN
    SELECT g.*, p.name as organizer_name
    FROM games g
    JOIN profiles p ON p.id = g.organizer_id
    WHERE g.status = 'active'
      AND g.date = current_date
  LOOP
    -- Calculate game start time
    game_start_time := (upcoming_game.date || ' ' || upcoming_game.time)::timestamptz;
    
    -- Calculate reminder window (30-35 minutes before game)
    reminder_window_start := game_start_time - interval '35 minutes';
    reminder_window_end := game_start_time - interval '30 minutes';
    
    -- Check if current time is within reminder window
    IF current_time BETWEEN reminder_window_start AND reminder_window_end THEN
      -- Get all participants
      SELECT array_agg(user_id) INTO participant_ids
      FROM game_participants
      WHERE game_id = upcoming_game.id AND status = 'joined';
      
      -- Add organizer
      participant_ids := array_append(participant_ids, upcoming_game.organizer_id);
      
      -- If no participants, skip
      IF participant_ids IS NULL OR array_length(participant_ids, 1) = 0 THEN
        CONTINUE;
      END IF;
      
      -- Create reminder notifications
      PERFORM create_game_notification(
        upcoming_game.id,
        'game_reminder',
        participant_ids,
        'Game Starting Soon',
        'Your ' || upcoming_game.sport || ' game at ' || upcoming_game.location || ' starts in 30 minutes!',
        jsonb_build_object(
          'organizer_id', upcoming_game.organizer_id,
          'organizer_name', upcoming_game.organizer_name,
          'latitude', upcoming_game.latitude,
          'longitude', upcoming_game.longitude
        )
      );
      
      reminder_count := reminder_count + array_length(participant_ids, 1);
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$;