/*
  # Player Rating & Review System

  1. New Tables
    - `game_ratings`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `rater_id` (uuid, foreign key to profiles)
      - `rated_id` (uuid, foreign key to profiles)
      - `rating` (integer, 1-5 stars)
      - `comment` (text, optional)
      - `created_at` (timestamp)

    - `player_stats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `total_ratings` (integer, default 0)
      - `average_rating` (numeric, default 0.0)
      - `games_completed` (integer, default 0)
      - `games_no_show` (integer, default 0)
      - `completion_rate` (numeric, default 100.0)
      - `positive_feedback_count` (integer, default 0)
      - `verified_player` (boolean, default false)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for rating system
    - Prevent rating abuse

  3. Functions
    - Function to submit ratings
    - Function to calculate player stats
    - Function to get player ratings
*/

-- Create game_ratings table
CREATE TABLE IF NOT EXISTS game_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, rater_id, rated_id),
  CHECK (rater_id != rated_id)
);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_ratings integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.0,
  games_completed integer DEFAULT 0,
  games_no_show integer DEFAULT 0,
  completion_rate numeric(5,2) DEFAULT 100.0,
  positive_feedback_count integer DEFAULT 0,
  verified_player boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Policies for game_ratings
CREATE POLICY "Users can view ratings for games they participated in"
  ON game_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.id = game_ratings.game_id 
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status = 'joined')
      )
    )
  );

CREATE POLICY "Users can submit ratings for completed games they participated in"
  ON game_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (
      SELECT 1 FROM games g
      LEFT JOIN game_participants gp ON g.id = gp.game_id
      WHERE g.id = game_ratings.game_id 
      AND g.status = 'completed'
      AND (
        g.organizer_id = auth.uid() 
        OR (gp.user_id = auth.uid() AND gp.status = 'joined')
      )
    )
  );

-- Policies for player_stats
CREATE POLICY "Player stats are viewable by authenticated users"
  ON player_stats
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own stats"
  ON player_stats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON player_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS game_ratings_game_id_idx ON game_ratings(game_id);
CREATE INDEX IF NOT EXISTS game_ratings_rater_id_idx ON game_ratings(rater_id);
CREATE INDEX IF NOT EXISTS game_ratings_rated_id_idx ON game_ratings(rated_id);
CREATE INDEX IF NOT EXISTS game_ratings_rating_idx ON game_ratings(rating);

CREATE INDEX IF NOT EXISTS player_stats_user_id_idx ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS player_stats_average_rating_idx ON player_stats(average_rating);
CREATE INDEX IF NOT EXISTS player_stats_completion_rate_idx ON player_stats(completion_rate);

-- Function to submit game ratings
CREATE OR REPLACE FUNCTION submit_game_ratings(
  game_id_param uuid,
  ratings_data json
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  game_record games%ROWTYPE;
  rating_item json;
  inserted_count integer := 0;
  error_count integer := 0;
BEGIN
  -- Get game details
  SELECT * INTO game_record FROM games WHERE id = game_id_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Check if game is completed
  IF game_record.status != 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Can only rate completed games');
  END IF;
  
  -- Check if user participated in the game
  IF NOT EXISTS (
    SELECT 1 FROM games g
    LEFT JOIN game_participants gp ON g.id = gp.game_id
    WHERE g.id = game_id_param 
    AND (
      g.organizer_id = auth.uid() 
      OR (gp.user_id = auth.uid() AND gp.status = 'joined')
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You did not participate in this game');
  END IF;
  
  -- Process each rating
  FOR rating_item IN SELECT * FROM json_array_elements(ratings_data)
  LOOP
    BEGIN
      INSERT INTO game_ratings (game_id, rater_id, rated_id, rating, comment)
      VALUES (
        game_id_param,
        auth.uid(),
        (rating_item->>'rated_id')::uuid,
        (rating_item->>'rating')::integer,
        rating_item->>'comment'
      )
      ON CONFLICT (game_id, rater_id, rated_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment;
      
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;
  
  -- Update player stats for all rated players
  PERFORM update_player_stats_for_game(game_id_param);
  
  RETURN json_build_object(
    'success', true, 
    'inserted', inserted_count,
    'errors', error_count,
    'message', 'Ratings submitted successfully'
  );
END;
$$;

-- Function to update player stats
CREATE OR REPLACE FUNCTION update_player_stats_for_game(game_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- Update stats for all participants in the game
  FOR participant_record IN
    SELECT DISTINCT rated_id as user_id
    FROM game_ratings
    WHERE game_id = game_id_param
  LOOP
    PERFORM update_player_stats(participant_record.user_id);
  END LOOP;
END;
$$;

-- Function to update individual player stats
CREATE OR REPLACE FUNCTION update_player_stats(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_ratings_count integer;
  avg_rating numeric;
  completed_games integer;
  no_show_games integer;
  positive_feedback integer;
  completion_rate numeric;
BEGIN
  -- Calculate total ratings and average
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
  INTO total_ratings_count, avg_rating
  FROM game_ratings
  WHERE rated_id = user_id_param;
  
  -- Calculate games completed (games where user was rated)
  SELECT COUNT(DISTINCT game_id)
  INTO completed_games
  FROM game_ratings
  WHERE rated_id = user_id_param;
  
  -- Calculate positive feedback (ratings 4-5 stars)
  SELECT COUNT(*)
  INTO positive_feedback
  FROM game_ratings
  WHERE rated_id = user_id_param AND rating >= 4;
  
  -- For now, set no_show_games to 0 (can be enhanced later)
  no_show_games := 0;
  
  -- Calculate completion rate
  IF (completed_games + no_show_games) > 0 THEN
    completion_rate := (completed_games::numeric / (completed_games + no_show_games)) * 100;
  ELSE
    completion_rate := 100.0;
  END IF;
  
  -- Insert or update player stats
  INSERT INTO player_stats (
    user_id, 
    total_ratings, 
    average_rating, 
    games_completed, 
    games_no_show, 
    completion_rate, 
    positive_feedback_count,
    verified_player,
    updated_at
  )
  VALUES (
    user_id_param,
    total_ratings_count,
    avg_rating,
    completed_games,
    no_show_games,
    completion_rate,
    positive_feedback,
    (total_ratings_count >= 5 AND avg_rating >= 4.0), -- Auto-verify if 5+ ratings with 4+ average
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_ratings = EXCLUDED.total_ratings,
    average_rating = EXCLUDED.average_rating,
    games_completed = EXCLUDED.games_completed,
    games_no_show = EXCLUDED.games_no_show,
    completion_rate = EXCLUDED.completion_rate,
    positive_feedback_count = EXCLUDED.positive_feedback_count,
    verified_player = EXCLUDED.verified_player,
    updated_at = now();
END;
$$;

-- Function to get player ratings and reviews
CREATE OR REPLACE FUNCTION get_player_ratings(
  user_id_param uuid,
  limit_param integer DEFAULT 10,
  offset_param integer DEFAULT 0
)
RETURNS TABLE (
  rating_id uuid,
  game_id uuid,
  game_sport text,
  game_date date,
  rater_name text,
  rating integer,
  comment text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.id as rating_id,
    gr.game_id,
    g.sport as game_sport,
    g.date as game_date,
    p.name as rater_name,
    gr.rating,
    gr.comment,
    gr.created_at
  FROM game_ratings gr
  JOIN games g ON g.id = gr.game_id
  JOIN profiles p ON p.id = gr.rater_id
  WHERE gr.rated_id = user_id_param
  ORDER BY gr.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to get game participants for rating
CREATE OR REPLACE FUNCTION get_game_participants_for_rating(game_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  average_rating numeric,
  total_ratings integer,
  already_rated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name,
    p.avatar_url,
    COALESCE(ps.average_rating, 0.0) as average_rating,
    COALESCE(ps.total_ratings, 0) as total_ratings,
    EXISTS(
      SELECT 1 FROM game_ratings gr 
      WHERE gr.game_id = game_id_param 
      AND gr.rater_id = auth.uid() 
      AND gr.rated_id = p.id
    ) as already_rated
  FROM profiles p
  LEFT JOIN player_stats ps ON ps.user_id = p.id
  WHERE p.id IN (
    SELECT gp.user_id 
    FROM game_participants gp 
    WHERE gp.game_id = game_id_param 
    AND gp.status = 'joined'
    AND gp.user_id != auth.uid()
    UNION
    SELECT g.organizer_id
    FROM games g
    WHERE g.id = game_id_param
    AND g.organizer_id != auth.uid()
  )
  ORDER BY p.name;
END;
$$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_player_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_player_stats_updated_at ON player_stats;
CREATE TRIGGER update_player_stats_updated_at
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_updated_at();