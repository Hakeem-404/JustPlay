-- Fix conversation participant ordering
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

  -- Try to find existing conversation (check both orders)
  SELECT id INTO conversation_id
  FROM conversations
  WHERE (participant_1 = ordered_p1 AND participant_2 = ordered_p2)
     OR (participant_1 = ordered_p2 AND participant_2 = ordered_p1);

  -- Create conversation if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO conversations (participant_1, participant_2)
    VALUES (ordered_p1, ordered_p2)
    RETURNING id INTO conversation_id;
  END IF;

  RETURN conversation_id;
END;
$$;