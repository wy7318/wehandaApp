/*
  # Add get_customers_by_restaurant stored procedure

  1. Changes
    - Add stored procedure to fetch customers with analytics
    - Includes total orders, bookings, and lifetime value
    - Calculates customer type based on order history
*/

CREATE OR REPLACE FUNCTION public.get_customers_by_restaurant(restaurant_id text)
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
      COUNT(DISTINCT CASE 
        WHEN b.date > CURRENT_DATE THEN b.id 
      END) as upcoming_bookings,
      COALESCE(SUM(o.total), 0) as lifetime_value
    FROM wehanda_customers c
    LEFT JOIN orders o ON o.customer_id = c.id AND o.restaurant_id = get_customers_by_restaurant.restaurant_id
    LEFT JOIN bookings b ON b.customer_id = c.id AND b.restaurant_id = get_customers_by_restaurant.restaurant_id
    WHERE EXISTS (
      SELECT 1 
      FROM orders o2 
      WHERE o2.customer_id = c.id 
      AND o2.restaurant_id = get_customers_by_restaurant.restaurant_id
      UNION
      SELECT 1 
      FROM bookings b2 
      WHERE b2.customer_id = c.id 
      AND b2.restaurant_id = get_customers_by_restaurant.restaurant_id
    )
    GROUP BY c.id, c.name, c.email, c.phone, c.city, c.country, c.created_date
  )
  SELECT * FROM customer_stats
  ORDER BY created_date DESC;
END;
$$;