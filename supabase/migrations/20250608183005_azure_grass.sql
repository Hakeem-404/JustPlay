/*
  # Create game participants system

  1. New Tables
    - `game_participants`
      - `id` (uuid, primary key)
      - `game_id` (uuid, references games)
      - `user_id` (uuid, references profiles)
      - `status` (text, joined/waitlist/left)
      - `joined_at` (timestamp)
      - `left_at` (timestamp, nullable)

  2. Security
    - Enable RLS on `game_participants` table
    - Add policies for participants to manage their own participation
    - Add policies for game organizers to view participants

  3. Functions
    - Function to join game with proper validation
    - Function to leave game
    - Function to get game participants count
*/

-- Create game_participants table
CREATE TABLE IF NOT EXISTS game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined', 'waitlist', 'left')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Enable RLS
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view participants of games they can see"
  ON game_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_participants.game_id 
      AND (
        games.organizer_id = auth.uid() 
        OR (NOT games.is_private AND games.status = 'active')
      )
    )
  );

CREATE POLICY "Users can join games"
  ON game_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON game_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS game_participants_game_id_idx ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS game_participants_user_id_idx ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS game_participants_status_idx ON game_participants(status);

-- Function to join a game
CREATE OR REPLACE FUNCTION join_game(game_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game_record games%ROWTYPE;
  current_participants_count integer;
  user_participation game_participants%ROWTYPE;
  result json;
BEGIN
  -- Get game details
  SELECT * INTO game_record FROM games WHERE id = game_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if game is in the future
  IF game_record.date < CURRENT_DATE OR 
     (game_record.date = CURRENT_DATE AND game_record.time < CURRENT_TIME) THEN
    RETURN json_build_object('success', false, 'error', 'Cannot join past games');
  END IF;
  
  -- Check if game is active
  IF game_record.status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Game is not active');
  END IF;
  
  -- Check if user is the organizer
  IF game_record.organizer_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'Cannot join your own game');
  END IF;
  
  -- Check existing participation
  SELECT * INTO user_participation 
  FROM game_participants 
  WHERE game_id = game_id_param AND user_id = auth.uid();
  
  IF FOUND AND user_participation.status = 'joined' THEN
    RETURN json_build_object('success', false, 'error', 'Already joined this game');
  END IF;
  
  -- Count current active participants
  SELECT COUNT(*) INTO current_participants_count
  FROM game_participants
  WHERE game_id = game_id_param AND status = 'joined';
  
  -- Determine status (joined or waitlist)
  IF current_participants_count < game_record.max_players THEN
    -- Insert or update participation as joined
    INSERT INTO game_participants (game_id, user_id, status, joined_at)
    VALUES (game_id_param, auth.uid(), 'joined', now())
    ON CONFLICT (game_id, user_id)
    DO UPDATE SET 
      status = 'joined',
      joined_at = now(),
      left_at = NULL,
      updated_at = now();
    
    -- Update game current_players count
    UPDATE games 
    SET current_players = current_participants_count + 1,
        updated_at = now()
    WHERE id = game_id_param;
    
    result := json_build_object(
      'success', true, 
      'status', 'joined',
      'message', 'Successfully joined the game!'
    );
  ELSE
    -- Add to waitlist
    INSERT INTO game_participants (game_id, user_id, status, joined_at)
    VALUES (game_id_param, auth.uid(), 'waitlist', now())
    ON CONFLICT (game_id, user_id)
    DO UPDATE SET 
      status = 'waitlist',
      joined_at = now(),
      left_at = NULL,
      updated_at = now();
    
    result := json_build_object(
      'success', true, 
      'status', 'waitlist',
      'message', 'Game is full. You have been added to the waitlist.'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Function to leave a game
CREATE OR REPLACE FUNCTION leave_game(game_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game_record games%ROWTYPE;
  user_participation game_participants%ROWTYPE;
  waitlist_user uuid;
  current_participants_count integer;
BEGIN
  -- Get game details
  SELECT * INTO game_record FROM games WHERE id = game_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check existing participation
  SELECT * INTO user_participation 
  FROM game_participants 
  WHERE game_id = game_id_param AND user_id = auth.uid() AND status IN ('joined', 'waitlist');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You are not part of this game');
  END IF;
  
  -- Update participation status to left
  UPDATE game_participants 
  SET status = 'left', 
      left_at = now(),
      updated_at = now()
  WHERE game_id = game_id_param AND user_id = auth.uid();
  
  -- If user was joined (not waitlist), handle the spot
  IF user_participation.status = 'joined' THEN
    -- Check if there's someone on the waitlist
    SELECT user_id INTO waitlist_user
    FROM game_participants
    WHERE game_id = game_id_param AND status = 'waitlist'
    ORDER BY joined_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      -- Move first waitlist person to joined
      UPDATE game_participants
      SET status = 'joined',
          updated_at = now()
      WHERE game_id = game_id_param AND user_id = waitlist_user;
    ELSE
      -- Decrease current_players count
      UPDATE games 
      SET current_players = GREATEST(current_players - 1, 1),
          updated_at = now()
      WHERE id = game_id_param;
    END IF;
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Successfully left the game');
END;
$$;

-- Function to get game participants
CREATE OR REPLACE FUNCTION get_game_participants(game_id_param uuid)
RETURNS TABLE (
  participant_id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  status text,
  joined_at timestamptz,
  average_rating numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.id as participant_id,
    gp.user_id,
    p.name,
    p.avatar_url,
    gp.status,
    gp.joined_at,
    p.average_rating
  FROM game_participants gp
  JOIN profiles p ON p.id = gp.user_id
  WHERE gp.game_id = game_id_param 
    AND gp.status IN ('joined', 'waitlist')
  ORDER BY 
    CASE WHEN gp.status = 'joined' THEN 1 ELSE 2 END,
    gp.joined_at ASC;
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_game_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_game_participants_updated_at
  BEFORE UPDATE ON game_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_game_participants_updated_at();