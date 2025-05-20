/*
  # Update user_restaurants RLS policies

  1. Changes
    - Add policy to allow app owners to create user-restaurant mappings
    - Add policy to allow app owners to read all user-restaurant mappings

  2. Security
    - Only app owners can create mappings for any user
    - Regular users can still manage their own mappings
*/

-- Add policy for app owners to create mappings
CREATE POLICY "App owners can create user restaurant mappings"
  ON user_restaurants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.app_owner = true
    )
  );

-- Add policy for app owners to read all mappings
CREATE POLICY "App owners can read all user restaurant mappings"
  ON user_restaurants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.app_owner = true
    )
  );