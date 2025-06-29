/*
  # Update Player Stats Function

  1. Functions
    - `update_player_stats` - Function to update player stats for a specific user
    - Exposed as an RPC function that can be called from the client
    - Calculates accurate stats based on real game data
*/

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
  total_games integer;
BEGIN
  -- Calculate total ratings and average
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
  INTO total_ratings_count, avg_rating
  FROM game_ratings
  WHERE rated_id = user_id_param;
  
  -- Calculate games completed (games with status 'completed' where user participated)
  SELECT COUNT(DISTINCT g.id)
  INTO completed_games
  FROM games g
  JOIN game_participants gp ON g.id = gp.game_id
  WHERE g.status = 'completed'
    AND gp.user_id = user_id_param
    AND gp.status = 'joined';
  
  -- Calculate total games joined
  SELECT COUNT(DISTINCT g.id)
  INTO total_games
  FROM games g
  JOIN game_participants gp ON g.id = gp.game_id
  WHERE gp.user_id = user_id_param
    AND gp.status = 'joined'
    AND g.status IN ('completed', 'cancelled', 'active');
  
  -- Calculate positive feedback (ratings 4-5 stars)
  SELECT COUNT(*)
  INTO positive_feedback
  FROM game_ratings
  WHERE rated_id = user_id_param AND rating >= 4;
  
  -- For now, set no_show_games to 0 (can be enhanced later)
  no_show_games := 0;
  
  -- Calculate completion rate
  IF total_games > 0 THEN
    completion_rate := (completed_games::numeric / total_games) * 100;
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
    
  -- Update profile average_rating to match
  UPDATE profiles
  SET average_rating = avg_rating
  WHERE id = user_id_param;
END;
$$;