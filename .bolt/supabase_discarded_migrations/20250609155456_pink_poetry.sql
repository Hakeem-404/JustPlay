/*
  # Chat System for JustPlay Games

  1. New Tables
    - `game_messages`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (text, required)
      - `message_type` (text, default 'text')
      - `status` (text, default 'sent')
      - `reply_to` (uuid, optional, for threaded messages)
      - `edited_at` (timestamp, nullable)
      - `deleted_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `message_reactions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to game_messages)
      - `user_id` (uuid, foreign key to profiles)
      - `emoji` (text, required)
      - `created_at` (timestamp)

    - `message_read_status`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to game_messages)
      - `user_id` (uuid, foreign key to profiles)
      - `read_at` (timestamp)

  2. Security
    - Enable RLS on all chat tables
    - Add policies for game participants to read/write messages
    - Add policies for message reactions and read status

  3. Indexes
    - Add indexes for performance on game_id, user_id, created_at
    - Add indexes for message reactions and read status

  4. Functions
    - Function to get chat messages with pagination
    - Function to mark messages as read
    - Function to get unread message count
*/

-- Create game_messages table
CREATE TABLE IF NOT EXISTS game_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join', 'leave')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'deleted')),
  reply_to uuid REFERENCES game_messages(id) ON DELETE SET NULL,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES game_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (length(emoji) > 0 AND length(emoji) <= 10),
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_read_status table
CREATE TABLE IF NOT EXISTS message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES game_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE game_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Policies for game_messages
CREATE POLICY "Game participants can view messages"
  ON game_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.id = game_messages.game_id 
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status IN ('joined', 'waitlist'))
      )
    )
  );

CREATE POLICY "Game participants can send messages"
  ON game_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.id = game_messages.game_id 
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status IN ('joined', 'waitlist'))
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON game_messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Game organizers can delete any message"
  ON game_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_messages.game_id 
      AND games.organizer_id = auth.uid()
    )
  );

-- Policies for message_reactions
CREATE POLICY "Game participants can view reactions"
  ON message_reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_messages gm
      JOIN games g ON g.id = gm.game_id
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE gm.id = message_reactions.message_id 
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status IN ('joined', 'waitlist'))
      )
    )
  );

CREATE POLICY "Game participants can add reactions"
  ON message_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM game_messages gm
      JOIN games g ON g.id = gm.game_id
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE gm.id = message_reactions.message_id 
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status IN ('joined', 'waitlist'))
      )
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON message_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for message_read_status
CREATE POLICY "Users can view their own read status"
  ON message_read_status
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
  ON message_read_status
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their read status"
  ON message_read_status
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS game_messages_game_id_idx ON game_messages(game_id);
CREATE INDEX IF NOT EXISTS game_messages_user_id_idx ON game_messages(user_id);
CREATE INDEX IF NOT EXISTS game_messages_created_at_idx ON game_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS game_messages_game_created_idx ON game_messages(game_id, created_at DESC);

CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON message_reactions(user_id);

CREATE INDEX IF NOT EXISTS message_read_status_message_id_idx ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS message_read_status_user_id_idx ON message_read_status(user_id);

-- Function to get chat messages with pagination
CREATE OR REPLACE FUNCTION get_game_messages(
  game_id_param uuid,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE (
  message_id uuid,
  game_id uuid,
  user_id uuid,
  user_name text,
  user_avatar_url text,
  content text,
  message_type text,
  status text,
  reply_to uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz,
  reactions json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id as message_id,
    gm.game_id,
    gm.user_id,
    p.name as user_name,
    p.avatar_url as user_avatar_url,
    CASE 
      WHEN gm.deleted_at IS NOT NULL THEN '[Message deleted]'
      ELSE gm.content
    END as content,
    gm.message_type,
    gm.status,
    gm.reply_to,
    gm.edited_at,
    gm.deleted_at,
    gm.created_at,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'emoji', mr.emoji,
            'count', reaction_counts.count,
            'users', reaction_counts.users
          )
        )
        FROM (
          SELECT 
            mr.emoji,
            COUNT(*) as count,
            json_agg(
              json_build_object(
                'user_id', mr.user_id,
                'name', rp.name
              )
            ) as users
          FROM message_reactions mr
          JOIN profiles rp ON rp.id = mr.user_id
          WHERE mr.message_id = gm.id
          GROUP BY mr.emoji
        ) reaction_counts
      ),
      '[]'::json
    ) as reactions
  FROM game_messages gm
  JOIN profiles p ON p.id = gm.user_id
  WHERE gm.game_id = game_id_param
  ORDER BY gm.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  game_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  marked_count integer;
BEGIN
  -- Insert read status for all unread messages in the game
  INSERT INTO message_read_status (message_id, user_id, read_at)
  SELECT gm.id, user_id_param, now()
  FROM game_messages gm
  WHERE gm.game_id = game_id_param
    AND gm.user_id != user_id_param -- Don't mark own messages as read
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status mrs
      WHERE mrs.message_id = gm.id AND mrs.user_id = user_id_param
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  RETURN marked_count;
END;
$$;

-- Function to get unread message count for a game
CREATE OR REPLACE FUNCTION get_unread_message_count(
  game_id_param uuid,
  user_id_param uuid DEFAULT auth.uid()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count integer;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM game_messages gm
  WHERE gm.game_id = game_id_param
    AND gm.user_id != user_id_param -- Don't count own messages
    AND gm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status mrs
      WHERE mrs.message_id = gm.id AND mrs.user_id = user_id_param
    );
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_message(
  game_id_param uuid,
  content_param text,
  message_type_param text DEFAULT 'text',
  reply_to_param uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_record game_messages%ROWTYPE;
  user_profile profiles%ROWTYPE;
BEGIN
  -- Validate user can send messages to this game
  IF NOT EXISTS (
    SELECT 1 FROM games g
    LEFT JOIN game_participants gp ON g.id = gp.game_id
    WHERE g.id = game_id_param 
    AND (
      g.organizer_id = auth.uid() 
      OR (gp.user_id = auth.uid() AND gp.status IN ('joined', 'waitlist'))
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to send messages to this game');
  END IF;
  
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  -- Insert message
  INSERT INTO game_messages (game_id, user_id, content, message_type, reply_to)
  VALUES (game_id_param, auth.uid(), content_param, message_type_param, reply_to_param)
  RETURNING * INTO message_record;
  
  -- Return success with message data
  RETURN json_build_object(
    'success', true,
    'message', json_build_object(
      'id', message_record.id,
      'game_id', message_record.game_id,
      'user_id', message_record.user_id,
      'user_name', user_profile.name,
      'user_avatar_url', user_profile.avatar_url,
      'content', message_record.content,
      'message_type', message_record.message_type,
      'status', message_record.status,
      'reply_to', message_record.reply_to,
      'created_at', message_record.created_at,
      'reactions', '[]'::json
    )
  );
END;
$$;

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_game_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_game_messages_updated_at ON game_messages;
CREATE TRIGGER update_game_messages_updated_at
  BEFORE UPDATE ON game_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_game_messages_updated_at();