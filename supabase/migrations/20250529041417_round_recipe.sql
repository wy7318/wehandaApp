/*
  # Fix numeric type mismatch in generate_suggested_campaigns function

  1. Changes
    - Drop and recreate the generate_suggested_campaigns function with correct numeric types
    - Ensure all numeric columns use numeric(10,2) for consistency
    - Add proper type casting in the function

  2. Technical Details
    - Fixes the type mismatch error in the 6th column
    - Uses explicit type casting to ensure numeric precision
    - Maintains data integrity with proper numeric handling
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_suggested_campaigns;

-- Recreate the function with proper type definitions
CREATE OR REPLACE FUNCTION generate_suggested_campaigns(
  p_restaurant_id TEXT,
  p_count INTEGER DEFAULT 3
)
RETURNS TABLE (
  name TEXT,
  description TEXT,
  type TEXT,
  discount_value NUMERIC(10,2),
  free_item_name TEXT,
  period_type TEXT,
  max_redemptions INTEGER,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  expected_revenue NUMERIC(10,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH restaurant_stats AS (
    SELECT 
      COALESCE(AVG(o.total)::NUMERIC(10,2), 50.00) as avg_order_value,
      COALESCE(COUNT(DISTINCT o.customer_id), 0) as customer_count
    FROM orders o
    WHERE o.restaurant_id = p_restaurant_id
    AND o.created_date >= NOW() - INTERVAL '30 days'
  ),
  campaign_types AS (
    SELECT unnest(ARRAY['amount_off', 'percentage_off', 'free_item', 'bogo']) as type
  )
  SELECT
    CASE ct.type
      WHEN 'amount_off' THEN 'First Order Discount'
      WHEN 'percentage_off' THEN 'Welcome Back Offer'
      WHEN 'free_item' THEN 'Free Item Promotion'
      ELSE 'Buy One Get One Free'
    END::TEXT as name,
    CASE ct.type
      WHEN 'amount_off' THEN 'Get $10 off your first order'
      WHEN 'percentage_off' THEN '15% off your next purchase'
      WHEN 'free_item' THEN 'Free appetizer with any main course'
      ELSE 'Buy any main course and get one free'
    END::TEXT as description,
    ct.type::TEXT,
    CASE ct.type
      WHEN 'amount_off' THEN 10.00
      WHEN 'percentage_off' THEN 15.00
      ELSE 0.00
    END::NUMERIC(10,2) as discount_value,
    CASE ct.type
      WHEN 'free_item' THEN 'Appetizer'
      WHEN 'bogo' THEN 'Main Course'
      ELSE NULL
    END as free_item_name,
    CASE 
      WHEN rs.customer_count < 100 THEN 'unlimited'::TEXT
      ELSE 'limited_number'::TEXT
    END as period_type,
    CASE 
      WHEN rs.customer_count < 100 THEN NULL
      ELSE 50
    END as max_redemptions,
    NOW() as start_date,
    NOW() + INTERVAL '30 days' as end_date,
    CASE ct.type
      WHEN 'amount_off' THEN (rs.avg_order_value - 10.00)::NUMERIC(10,2)
      WHEN 'percentage_off' THEN (rs.avg_order_value * 0.85)::NUMERIC(10,2)
      WHEN 'free_item' THEN (rs.avg_order_value - 8.00)::NUMERIC(10,2)
      ELSE (rs.avg_order_value * 1.5)::NUMERIC(10,2)
    END as expected_revenue
  FROM campaign_types ct
  CROSS JOIN restaurant_stats rs
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;