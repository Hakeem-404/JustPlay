/*
  # Friends System and Private Messaging

  1. New Tables
    - `friendships`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, foreign key to profiles)
      - `addressee_id` (uuid, foreign key to profiles)
      - `status` (text, pending/accepted/blocked)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `private_messages`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, foreign key to profiles)
      - `recipient_id` (uuid, foreign key to profiles)
      - `content` (text, required)
      - `read_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `conversations`
      - `id` (uuid, primary key)
      - `participant_1` (uuid, foreign key to profiles)
      - `participant_2` (uuid, foreign key to profiles)
      - `last_message_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for friends to manage friendships
    - Add policies for private messaging between friends

  3. Functions
    - Function to send friend request
    - Function to accept/decline friend request
    - Function to get friends list
    - Function to send private message
    - Function to get conversation messages
*/

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1, participant_2),
  CHECK (participant_1 != participant_2)
);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Policies for friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

CREATE POLICY "Users can send friend requests"
  ON friendships
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update friendships they're part of"
  ON friendships
  FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid())
  WITH CHECK (requester_id = auth.uid() OR addressee_id = auth.uid());

-- Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Users can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

CREATE POLICY "Users can update their conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (participant_1 = auth.uid() OR participant_2 = auth.uid())
  WITH CHECK (participant_1 = auth.uid() OR participant_2 = auth.uid());

-- Policies for private_messages
CREATE POLICY "Users can view messages in their conversations"
  ON private_messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send private messages"
  ON private_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON private_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships(status);

CREATE INDEX IF NOT EXISTS conversations_participant_1_idx ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS conversations_participant_2_idx ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS conversations_last_message_idx ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS private_messages_conversation_idx ON private_messages(conversation_id);
CREATE INDEX IF NOT EXISTS private_messages_sender_idx ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS private_messages_recipient_idx ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS private_messages_created_idx ON private_messages(created_at DESC);

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(addressee_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_friendship friendships%ROWTYPE;
  result json;
BEGIN
  -- Check if friendship already exists
  SELECT * INTO existing_friendship
  FROM friendships
  WHERE (requester_id = auth.uid() AND addressee_id = addressee_id_param)
     OR (requester_id = addressee_id_param AND addressee_id = auth.uid());

  IF FOUND THEN
    IF existing_friendship.status = 'accepted' THEN
      RETURN json_build_object('success', false, 'error', 'Already friends');
    ELSIF existing_friendship.status = 'pending' THEN
      RETURN json_build_object('success', false, 'error', 'Friend request already sent');
    ELSIF existing_friendship.status = 'blocked' THEN
      RETURN json_build_object('success', false, 'error', 'Cannot send friend request');
    END IF;
  END IF;

  -- Insert friend request
  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (auth.uid(), addressee_id_param, 'pending');

  RETURN json_build_object('success', true, 'message', 'Friend request sent');
END;
$$;

-- Function to respond to friend request
CREATE OR REPLACE FUNCTION respond_to_friend_request(
  friendship_id_param uuid,
  response_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  friendship_record friendships%ROWTYPE;
BEGIN
  -- Get friendship record
  SELECT * INTO friendship_record
  FROM friendships
  WHERE id = friendship_id_param AND addressee_id = auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Friend request not found');
  END IF;

  IF friendship_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Friend request already responded to');
  END IF;

  -- Update friendship status
  UPDATE friendships
  SET status = response_param, updated_at = now()
  WHERE id = friendship_id_param;

  IF response_param = 'accepted' THEN
    RETURN json_build_object('success', true, 'message', 'Friend request accepted');
  ELSE
    RETURN json_build_object('success', true, 'message', 'Friend request declined');
  END IF;
END;
$$;

-- Function to get friends list
CREATE OR REPLACE FUNCTION get_friends_list(user_id_param uuid DEFAULT auth.uid())
RETURNS TABLE (
  friend_id uuid,
  friend_name text,
  friend_avatar_url text,
  friend_location text,
  friendship_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.requester_id = user_id_param THEN f.addressee_id
      ELSE f.requester_id
    END as friend_id,
    p.name as friend_name,
    p.avatar_url as friend_avatar_url,
    p.location as friend_location,
    f.created_at as friendship_created_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.requester_id = user_id_param THEN p.id = f.addressee_id
      ELSE p.id = f.requester_id
    END
  )
  WHERE (f.requester_id = user_id_param OR f.addressee_id = user_id_param)
    AND f.status = 'accepted'
  ORDER BY f.created_at DESC;
END;
$$;

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  participant_1_param uuid,
  participant_2_param uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
  ordered_p1 uuid;
  ordered_p2 uuid;
BEGIN
  -- Order participants to ensure consistent conversation lookup
  IF participant_1_param < participant_2_param THEN
    ordered_p1 := participant_1_param;
    ordered_p2 := participant_2_param;
  ELSE
    ordered_p1 := participant_2_param;
    ordered_p2 := participant_1_param;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM conversations
  WHERE participant_1 = ordered_p1 AND participant_2 = ordered_p2;

  -- Create conversation if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO conversations (participant_1, participant_2)
    VALUES (ordered_p1, ordered_p2)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$;

-- Function to send private message
CREATE OR REPLACE FUNCTION send_private_message(
  recipient_id_param uuid,
  content_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id uuid;
  message_record private_messages%ROWTYPE;
  sender_profile profiles%ROWTYPE;
BEGIN
  -- Check if users are friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE ((requester_id = auth.uid() AND addressee_id = recipient_id_param)
        OR (requester_id = recipient_id_param AND addressee_id = auth.uid()))
      AND status = 'accepted'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Can only message friends');
  END IF;

  -- Get or create conversation
  SELECT get_or_create_conversation(auth.uid(), recipient_id_param) INTO conversation_id;

  -- Get sender profile
  SELECT * INTO sender_profile FROM profiles WHERE id = auth.uid();

  -- Insert message
  INSERT INTO private_messages (conversation_id, sender_id, recipient_id, content)
  VALUES (conversation_id, auth.uid(), recipient_id_param, content_param)
  RETURNING * INTO message_record;

  -- Update conversation last_message_at
  UPDATE conversations
  SET last_message_at = now()
  WHERE id = conversation_id;

  -- Return success with message data
  RETURN json_build_object(
    'success', true,
    'message', json_build_object(
      'id', message_record.id,
      'conversation_id', message_record.conversation_id,
      'sender_id', message_record.sender_id,
      'recipient_id', message_record.recipient_id,
      'sender_name', sender_profile.name,
      'sender_avatar_url', sender_profile.avatar_url,
      'content', message_record.content,
      'created_at', message_record.created_at
    )
  );
END;
$$;

-- Function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
  conversation_id_param uuid,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  recipient_id uuid,
  sender_name text,
  sender_avatar_url text,
  content text,
  read_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id as message_id,
    pm.conversation_id,
    pm.sender_id,
    pm.recipient_id,
    p.name as sender_name,
    p.avatar_url as sender_avatar_url,
    pm.content,
    pm.read_at,
    pm.created_at
  FROM private_messages pm
  JOIN profiles p ON p.id = pm.sender_id
  WHERE pm.conversation_id = conversation_id_param
  ORDER BY pm.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Create trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_private_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

DROP TRIGGER IF EXISTS update_private_messages_updated_at ON private_messages;
CREATE TRIGGER update_private_messages_updated_at
  BEFORE UPDATE ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_private_messages_updated_at();