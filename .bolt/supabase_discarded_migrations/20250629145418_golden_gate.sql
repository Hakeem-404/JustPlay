/*
  # Fix Game Completion Functionality

  1. Changes
    - Add policy to allow organizers to mark games as completed
    - Add policy to allow participants to mark games as completed
    - Fix game completion functionality for past games

  2. Security
    - Ensure only organizers and participants can mark games as completed
    - Ensure games can only be marked as completed if they are in the past
*/

-- Create policy to allow organizers to mark games as completed
CREATE POLICY "Organizers can mark games as completed"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    -- User must be the organizer
    organizer_id = auth.uid()
    -- Game must be in the past
    AND (date < CURRENT_DATE OR (date = CURRENT_DATE AND time < CURRENT_TIME))
    -- Only allow updating the status field to 'completed'
    AND (
      (to_jsonb(NEW) - to_jsonb(OLD)) ?& ARRAY['status', 'updated_at']
      AND NEW.status = 'completed'
    )
  )
  WITH CHECK (
    -- User must be the organizer
    organizer_id = auth.uid()
    -- Game must be in the past
    AND (date < CURRENT_DATE OR (date = CURRENT_DATE AND time < CURRENT_TIME))
    -- Only allow updating the status field to 'completed'
    AND (
      (to_jsonb(NEW) - to_jsonb(OLD)) ?& ARRAY['status', 'updated_at']
      AND NEW.status = 'completed'
    )
  );

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
    -- Only allow updating the status field to 'completed'
    AND (
      (to_jsonb(NEW) - to_jsonb(OLD)) ?& ARRAY['status', 'updated_at']
      AND NEW.status = 'completed'
    )
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
    -- Only allow updating the status field to 'completed'
    AND (
      (to_jsonb(NEW) - to_jsonb(OLD)) ?& ARRAY['status', 'updated_at']
      AND NEW.status = 'completed'
    )
  );