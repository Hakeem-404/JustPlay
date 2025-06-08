/*
  # User Profiles Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `name` (text, required)
      - `email` (text, required)
      - `avatar_url` (text, optional)
      - `location` (text, required)
      - `bio` (text, optional)
      - `skill_level` (text, required - beginner/intermediate/advanced)
      - `preferred_sports` (text array, required)
      - `games_played` (integer, default 0)
      - `games_organized` (integer, default 0)
      - `average_rating` (decimal, default 0.0)
      - `profile_completed` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for users to read/update their own profile
    - Add policy for public profile viewing
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  location text NOT NULL,
  bio text,
  skill_level text NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_sports text[] NOT NULL DEFAULT '{}',
  games_played integer DEFAULT 0,
  games_organized integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0.0,
  profile_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy for public profile viewing (for other users to see basic info)
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (profile_completed = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();