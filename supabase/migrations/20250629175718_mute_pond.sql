-- Improved function to update player stats with accurate completed games count
CREATE OR REPLACE FUNCTION update_player_stats(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_ratings_count integer;
  avg_rating numeric;
  completed_games integer;
  organized_completed_games integer;
  total_joined_games integer;
  total_organized_games integer;
  no_show_games integer;
  positive_feedback integer;
  completion_rate numeric;
BEGIN
  -- Calculate total ratings and average
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
  INTO total_ratings_count, avg_rating
  FROM game_ratings
  WHERE rated_id = user_id_param;
  
  -- Calculate games completed as participant (games with status 'completed' where user participated)
  SELECT COUNT(DISTINCT g.id)
  INTO completed_games
  FROM games g
  JOIN game_participants gp ON g.id = gp.game_id
  WHERE g.status = 'completed'
    AND gp.user_id = user_id_param
    AND gp.status = 'joined';
  
  -- Calculate games completed as organizer
  SELECT COUNT(*)
  INTO organized_completed_games
  FROM games
  WHERE organizer_id = user_id_param
    AND status = 'completed';
  
  -- Calculate total games joined (as participant)
  SELECT COUNT(DISTINCT g.id)
  INTO total_joined_games
  FROM games g
  JOIN game_participants gp ON g.id = gp.game_id
  WHERE gp.user_id = user_id_param
    AND gp.status = 'joined';
  
  -- Calculate total games organized
  SELECT COUNT(*)
  INTO total_organized_games
  FROM games
  WHERE organizer_id = user_id_param;
  
  -- For now, set no_show_games to 0 (can be enhanced later)
  no_show_games := 0;
  
  -- Calculate completion rate based on joined games
  IF total_joined_games > 0 THEN
    completion_rate := (completed_games::numeric / total_joined_games) * 100;
  ELSE
    completion_rate := 100.0;
  END IF;
  
  -- Calculate positive feedback (ratings 4-5 stars)
  SELECT COUNT(*)
  INTO positive_feedback
  FROM game_ratings
  WHERE rated_id = user_id_param AND rating >= 4;
  
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
    completed_games + organized_completed_games, -- Total completed games (as participant + as organizer)
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
    
  -- Update profile stats
  UPDATE profiles
  SET 
    average_rating = avg_rating,
    games_played = total_joined_games,
    games_organized = total_organized_games
  WHERE id = user_id_param;
  
  -- Log the update for debugging
  RAISE NOTICE 'Updated stats for user %: completed games: %, total joined: %, total organized: %, completion rate: %', 
    user_id_param, completed_games + organized_completed_games, total_joined_games, total_organized_games, completion_rate;
END;
$$;

-- Function to update stats for all users (admin function)
CREATE OR REPLACE FUNCTION update_all_player_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  update_count integer := 0;
BEGIN
  FOR user_record IN
    SELECT id FROM profiles
  LOOP
    PERFORM update_player_stats(user_record.id);
    update_count := update_count + 1;
  END LOOP;
  
  RETURN update_count;
END;
$$;