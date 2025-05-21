/*
  # Create get_customers_by_restaurants function

  1. New Function
    - `get_customers_by_restaurants`
      - Input: restaurant_id (text)
      - Returns: Table of customer information including:
        - Basic customer details (id, name, email, etc.)
        - Order statistics
        - Booking information
  
  2. Purpose
    - Aggregates customer data and their interactions with a specific restaurant
    - Calculates important metrics like total orders, bookings, and lifetime value
    - Returns enriched customer profiles for the restaurant dashboard
*/

CREATE OR REPLACE FUNCTION get_customers_by_restaurants(restaurant_id text)
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
    -- Get order statistics
    SELECT 
      o.customer_id,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.total), 0) as total_spent
    FROM orders o
    WHERE o.restaurant_id = get_customers_by_restaurants.restaurant_id
    GROUP BY o.customer_id
  ),
  booking_stats AS (
    -- Get booking statistics
    SELECT 
      b.customer_id,
      COUNT(DISTINCT b.id) as booking_count,
      COUNT(DISTINCT CASE 
        WHEN b.date > CURRENT_DATE 
        AND b.status NOT IN ('cancelled', 'completed') 
        THEN b.id 
      END) as upcoming_count
    FROM bookings b
    WHERE b.restaurant_id = get_customers_by_restaurants.restaurant_id
    GROUP BY b.customer_id
  )
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.country,
    c.created_date,
    CASE 
      WHEN cs.order_count >= 3 OR bs.booking_count >= 3 THEN 'regular'
      ELSE 'new'
    END as type,
    COALESCE(cs.order_count, 0) as total_orders,
    COALESCE(bs.booking_count, 0) as total_bookings,
    COALESCE(bs.upcoming_count, 0) as upcoming_bookings,
    COALESCE(cs.total_spent, 0) as lifetime_value
  FROM wehanda_customers c
  LEFT JOIN customer_stats cs ON c.id = cs.customer_id
  LEFT JOIN booking_stats bs ON c.id = bs.customer_id
  WHERE EXISTS (
    SELECT 1 
    FROM orders o 
    WHERE o.customer_id = c.id 
    AND o.restaurant_id = get_customers_by_restaurants.restaurant_id
    UNION
    SELECT 1 
    FROM bookings b 
    WHERE b.customer_id = c.id 
    AND b.restaurant_id = get_customers_by_restaurants.restaurant_id
  )
  ORDER BY c.created_date DESC;
END;
$$;