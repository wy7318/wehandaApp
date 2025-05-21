/*
  # Fix customer analytics function

  1. Changes
    - Restore detailed customer analytics including orders and bookings
    - Return both customer details and analytics in a single query
    - Fix column ambiguity issues
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
    SELECT 
      wc.id,
      COUNT(DISTINCT o.id) as order_count,
      COUNT(DISTINCT b.id) as booking_count,
      COUNT(DISTINCT CASE 
        WHEN b.date > CURRENT_DATE 
        AND b.status != 'cancelled' 
        THEN b.id 
      END) as upcoming_booking_count,
      COALESCE(SUM(o.total), 0) as total_spent
    FROM wehanda_customers wc
    LEFT JOIN orders o ON wc.id = o.customer_id AND o.restaurant_id = restaurant_id
    LEFT JOIN bookings b ON wc.id = b.customer_id AND b.restaurant_id = restaurant_id
    WHERE wc.restaurants::jsonb @> jsonb_build_array(restaurant_id)
    GROUP BY wc.id
  )
  SELECT 
    wc.id,
    wc.name,
    wc.email,
    wc.phone,
    wc.city,
    wc.country,
    wc.created_date,
    CASE 
      WHEN cs.order_count >= 3 OR cs.booking_count >= 3 THEN 'regular'
      ELSE 'guest'
    END as type,
    cs.order_count as total_orders,
    cs.booking_count as total_bookings,
    cs.upcoming_booking_count as upcoming_bookings,
    cs.total_spent as lifetime_value
  FROM wehanda_customers wc
  JOIN customer_stats cs ON wc.id = cs.id
  ORDER BY wc.created_date DESC;
END;
$$;