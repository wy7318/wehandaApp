/*
  # Create waitlist table and related components

  1. New Tables
    - `waitlist`
      - `id` (uuid, primary key)
      - `restaurant_id` (text, foreign key to restaurants)
      - `name` (text)
      - `email` (text)
      - `phone` (text)
      - `number_of_guests` (integer)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `waitlist` table
    - Add policies for authenticated users
*/

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text REFERENCES restaurants(id) NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  number_of_guests integer NOT NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'seated', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_restaurant ON waitlist(restaurant_id);

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read waitlist entries for their restaurants"
  ON waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = waitlist.restaurant_id
    )
  );

CREATE POLICY "Users can insert waitlist entries for their restaurants"
  ON waitlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = waitlist.restaurant_id
    )
  );

CREATE POLICY "Users can update waitlist entries for their restaurants"
  ON waitlist
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = waitlist.restaurant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = waitlist.restaurant_id
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;