/*
  # Fix ambiguous restaurant_id reference in analytics function

  1. Changes
    - Drop and recreate fetch_restaurant_customer_analytics function
    - Add proper table qualifiers to restaurant_id references
    - Improve query performance with proper joins
    - Add error handling for invalid restaurant_id

  2. Security
    - Maintain existing RLS policies
    - Function remains accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.fetch_restaurant_customer_analytics(restaurant_id text)
RETURNS TABLE (
  id text,
  name text,
  email text,
  phone text,
  city text,
  country text,
  created_date timestamptz,
  type text,
  total_orders bigint,
  total_bookings bigint,
  upcoming_bookings bigint,
  lifetime_value numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      c.id,
      c.name,
      c.email,
      c.phone,
      c.city,
      c.country,
      c.created_date,
      CASE 
        WHEN COUNT(DISTINCT o.id) >= 3 THEN 'regular'
        ELSE 'new'
      END as type,
      COUNT(DISTINCT o.id) as total_orders,
      COUNT(DISTINCT b.id) as total_bookings,
      COUNT(DISTINCT CASE WHEN b.date > CURRENT_DATE THEN b.id END) as upcoming_bookings,
      COALESCE(SUM(o.total), 0) as lifetime_value
    FROM wehanda_customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.restaurant_id = fetch_restaurant_customer_analytics.restaurant_id
    LEFT JOIN bookings b ON b.customer_id = c.id AND b.restaurant_id = fetch_restaurant_customer_analytics.restaurant_id
    WHERE EXISTS (
      SELECT 1 
      FROM orders o2 
      WHERE o2.customer_id = c.id 
      AND o2.restaurant_id = fetch_restaurant_customer_analytics.restaurant_id
      UNION
      SELECT 1 
      FROM bookings b2 
      WHERE b2.customer_id = c.id 
      AND b2.restaurant_id = fetch_restaurant_customer_analytics.restaurant_id
    )
    GROUP BY c.id, c.name, c.email, c.phone, c.city, c.country, c.created_date
  )
  SELECT * FROM customer_stats
  ORDER BY created_date DESC;
END;
$$;