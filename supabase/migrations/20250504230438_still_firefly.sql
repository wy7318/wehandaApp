/*
  # Create bookings table and related tables

  1. New Tables
    - `bookings`
      - `id` (text, primary key) - Booking ID from Wehanda
      - `restaurant_id` (text) - Reference to restaurants table
      - `customer_id` (text) - Reference to wehanda_customers table
      - `status` (text) - Booking status (e.g., unconfirmed, confirmed)
      - `notes` (text) - Booking notes
      - `number` (text) - Booking number
      - `web_url` (text) - Booking web URL
      - `date` (text) - Booking date
      - `time` (text) - Booking time
      - `timestamp` (bigint) - Booking timestamp
      - `number_of_people` (integer) - Number of people
      - `created_date` (timestamptz) - Creation date
      - `modified_date` (timestamptz) - Last modification date

  2. Security
    - Enable RLS on `bookings` table
    - Add policy for authenticated users to read bookings
*/

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  restaurant_id text REFERENCES restaurants(id),
  customer_id text REFERENCES wehanda_customers(id),
  status text,
  notes text,
  number text,
  web_url text,
  date text,
  time text,
  timestamp bigint,
  number_of_people integer,
  created_date timestamptz DEFAULT now(),
  modified_date timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant ON bookings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);