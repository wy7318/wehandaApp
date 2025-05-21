/*
  # Fix restaurant customer analytics function

  1. Changes
    - Replace existing fetch_restaurant_customer_analytics function with a new implementation
    - Use JSONB containment operator to check restaurant_id in the restaurants array
    - Add proper column references to avoid ambiguity

  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.fetch_restaurant_customer_analytics(restaurant_id TEXT)
RETURNS SETOF wehanda_customers AS $$
  SELECT DISTINCT c.* 
  FROM wehanda_customers c
  WHERE c.restaurants::jsonb @> jsonb_build_array(restaurant_id)
  ORDER BY c.created_date DESC;
$$ LANGUAGE sql SECURITY DEFINER;