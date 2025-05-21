/*
  # Rename and enhance customer analytics function
  
  1. Changes
    - Rename function from get_customers_by_restaurant to fetch_restaurant_customer_analytics
    - Add more descriptive comments
    - Improve type safety with explicit type casts
*/

CREATE OR REPLACE FUNCTION fetch_restaurant_customer_analytics(restaurant_id text)
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      c.id,
      COUNT(DISTINCT o.id)::bigint as order_count,
      COUNT(DISTINCT b.id)::bigint as booking_count,
      COUNT(DISTINCT CASE 
        WHEN b.date > CURRENT_DATE 
        AND b.status != 'cancelled' 
        THEN b.id 
      END)::bigint as upcoming_booking_count,
      COALESCE(SUM(o.total), 0)::numeric as total_spent
    FROM wehanda_customers c
    LEFT JOIN orders o ON c.id = o.customer_id AND o.restaurant_id = restaurant_id
    LEFT JOIN bookings b ON c.id = b.customer_id AND b.restaurant_id = restaurant_id
    GROUP BY c.id
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
      WHEN cs.order_count >= 3 OR cs.booking_count >= 3 THEN 'regular'
      ELSE 'guest'
    END as type,
    cs.order_count as total_orders,
    cs.booking_count as total_bookings,
    cs.upcoming_booking_count as upcoming_bookings,
    cs.total_spent as lifetime_value
  FROM wehanda_customers c
  JOIN customer_stats cs ON c.id = cs.id
  WHERE c.restaurants ? restaurant_id
  ORDER BY c.created_date DESC;
END;
$$;