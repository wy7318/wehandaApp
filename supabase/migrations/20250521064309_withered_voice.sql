/*
  # Fix customer summary display

  1. Changes
    - Optimize booking count queries
    - Add total bookings count
    - Add upcoming bookings count
    - Fix date comparison for upcoming bookings
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
  -- Validate input
  IF restaurant_id IS NULL THEN
    RAISE EXCEPTION 'restaurant_id cannot be null';
  END IF;

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
    -- Get booking statistics with proper date handling
    SELECT 
      b.customer_id,
      COUNT(DISTINCT b.id) as booking_count,
      COUNT(DISTINCT CASE 
        WHEN (
          CASE 
            WHEN b.date ~ '^\d{4}-\d{2}-\d{2}$' THEN 
              (b.date || ' ' || COALESCE(b.time, '00:00'))::timestamp > CURRENT_TIMESTAMP
            ELSE FALSE
          END
        )
        AND b.status NOT IN ('cancelled', 'completed') 
        THEN b.id 
      END) as upcoming_count
    FROM bookings b
    WHERE b.restaurant_id = get_customers_by_restaurants.restaurant_id
    GROUP BY b.customer_id
  )
  SELECT DISTINCT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.country,
    c.created_date,
    CASE 
      WHEN COALESCE(cs.order_count, 0) >= 3 OR COALESCE(bs.booking_count, 0) >= 3 THEN 'regular'
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