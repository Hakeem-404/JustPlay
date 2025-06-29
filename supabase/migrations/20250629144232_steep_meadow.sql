/*
  # Game Completion Policy

  1. New Policies
    - Allow participants to mark games as completed
    - Ensure games can only be marked as completed if they're in the past

  2. Changes
    - Add policy for game participants to update game status to completed
    - Maintain existing policy for organizers to update their games
*/

-- Create policy to allow participants to mark games as completed
CREATE POLICY "Participants can mark games as completed"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    -- Game must be in the past
    (date < CURRENT_DATE OR (date = CURRENT_DATE AND time < CURRENT_TIME))
    -- User must be a participant
    AND EXISTS (
      SELECT 1 FROM game_participants
      WHERE game_id = id
      AND user_id = auth.uid()
      AND status = 'joined'
    )
    -- Only allow updating the status field
    AND (SELECT array_length(akeys(to_jsonb(NEW) - to_jsonb(OLD)), 1)) = 1
    AND (to_jsonb(NEW) - to_jsonb(OLD)) ? 'status'
    AND NEW.status = 'completed'
  )
  WITH CHECK (
    -- Game must be in the past
    (date < CURRENT_DATE OR (date = CURRENT_DATE AND time < CURRENT_TIME))
    -- User must be a participant
    AND EXISTS (
      SELECT 1 FROM game_participants
      WHERE game_id = id
      AND user_id = auth.uid()
      AND status = 'joined'
    )
    -- Only allow updating the status field
    AND (SELECT array_length(akeys(to_jsonb(NEW) - to_jsonb(OLD)), 1)) = 1
    AND (to_jsonb(NEW) - to_jsonb(OLD)) ? 'status'
    AND NEW.status = 'completed'
  );