/*
  # Enable realtime for bookings table and add INSERT policy

  1. Changes
    - Enable realtime for bookings table
    - Add INSERT policy for bookings table
*/

-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Add INSERT policy for bookings
CREATE POLICY "Enable insert for authenticated users only"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);