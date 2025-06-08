/*
  # Create games table for JustPlay

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `sport` (text, required)
      - `title` (text, optional)
      - `location` (text, required)
      - `latitude` (numeric, required)
      - `longitude` (numeric, required)
      - `date` (date, required)
      - `time` (time, required)
      - `max_players` (integer, required)
      - `current_players` (integer, default 1)
      - `skill_level` (text, check constraint)
      - `description` (text, optional)
      - `organizer_id` (uuid, foreign key to profiles)
      - `is_private` (boolean, default false)
      - `status` (text, default 'active')
      - `created_at` (timestamptz, default now)
      - `updated_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `games` table
    - Add policies for authenticated users to read public games
    - Add policies for organizers to manage their own games
    - Add policies for authenticated users to create games

  3. Indexes
    - Add index on location coordinates for spatial queries
    - Add index on date for time-based queries
    - Add index on organizer_id for user's games
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sport text NOT NULL,
  title text,
  location text NOT NULL,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  max_players integer NOT NULL CHECK (max_players >= 2 AND max_players <= 100),
  current_players integer NOT NULL DEFAULT 1 CHECK (current_players >= 0),
  skill_level text NOT NULL DEFAULT 'any' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'any')),
  description text,
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_private boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies for reading games
CREATE POLICY "Public games are viewable by everyone"
  ON games
  FOR SELECT
  TO authenticated
  USING (NOT is_private AND status = 'active');

CREATE POLICY "Private games are viewable by participants"
  ON games
  FOR SELECT
  TO authenticated
  USING (is_private AND organizer_id = auth.uid());

CREATE POLICY "Organizers can view their own games"
  ON games
  FOR SELECT
  TO authenticated
  USING (organizer_id = auth.uid());

-- Policies for creating games
CREATE POLICY "Authenticated users can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (organizer_id = auth.uid());

-- Policies for updating games
CREATE POLICY "Organizers can update their own games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- Policies for deleting games
CREATE POLICY "Organizers can delete their own games"
  ON games
  FOR DELETE
  TO authenticated
  USING (organizer_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS games_location_idx ON games USING btree (latitude, longitude);
CREATE INDEX IF NOT EXISTS games_date_idx ON games USING btree (date);
CREATE INDEX IF NOT EXISTS games_organizer_idx ON games USING btree (organizer_id);
CREATE INDEX IF NOT EXISTS games_sport_idx ON games USING btree (sport);
CREATE INDEX IF NOT EXISTS games_status_idx ON games USING btree (status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_updated_at();

-- Add constraint to ensure current_players doesn't exceed max_players
ALTER TABLE games ADD CONSTRAINT games_players_check 
  CHECK (current_players <= max_players);