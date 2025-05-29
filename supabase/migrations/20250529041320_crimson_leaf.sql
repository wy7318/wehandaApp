/*
  # Fix ambiguous name column in generate_suggested_campaigns function

  1. Changes
    - Drop existing generate_suggested_campaigns function if it exists
    - Create new version with properly qualified column names
    - Add proper table aliases to avoid ambiguous column references
    
  2. Security
    - Function remains accessible to authenticated users only
    - No changes to existing security policies
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_suggested_campaigns;

-- Create new version with properly qualified column names
CREATE OR REPLACE FUNCTION generate_suggested_campaigns(
  p_restaurant_id TEXT,
  p_count INTEGER DEFAULT 3
)
RETURNS SETOF marketing_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH restaurant_stats AS (
    SELECT 
      r.id as restaurant_id,
      r.name as restaurant_name,
      COUNT(DISTINCT o.id) as total_orders,
      AVG(o.total) as avg_order_value,
      COUNT(DISTINCT o.customer_id) as unique_customers
    FROM restaurants r
    LEFT JOIN orders o ON o.restaurant_id = r.id
    WHERE r.id = p_restaurant_id
    GROUP BY r.id, r.name
  ),
  suggested_campaigns AS (
    -- Generate percentage off campaign
    SELECT 
      gen_random_uuid() as id,
      p_restaurant_id as restaurant_id,
      'Percentage Off Special' as name,
      'Get 15% off your next order' as description,
      'percentage_off' as type,
      15.00 as discount_value,
      NULL as free_item_name,
      'limited_number' as period_type,
      100 as max_redemptions,
      NOW() as start_date,
      NOW() + INTERVAL '30 days' as end_date,
      'draft' as status,
      NOW() as created_at,
      NOW() as updated_at,
      (SELECT avg_order_value * 0.85 * 100 FROM restaurant_stats) as expected_revenue
    UNION ALL
    -- Generate amount off campaign
    SELECT 
      gen_random_uuid() as id,
      p_restaurant_id as restaurant_id,
      'Fixed Amount Discount' as name,
      'Save $10 on orders over $50' as description,
      'amount_off' as type,
      10.00 as discount_value,
      NULL as free_item_name,
      'date_range' as period_type,
      NULL as max_redemptions,
      NOW() as start_date,
      NOW() + INTERVAL '14 days' as end_date,
      'draft' as status,
      NOW() as created_at,
      NOW() as updated_at,
      (SELECT avg_order_value * 0.90 * 75 FROM restaurant_stats) as expected_revenue
    UNION ALL
    -- Generate BOGO campaign
    SELECT 
      gen_random_uuid() as id,
      p_restaurant_id as restaurant_id,
      'Buy One Get One Free' as name,
      'Buy any main dish and get one free' as description,
      'bogo' as type,
      NULL as discount_value,
      NULL as free_item_name,
      'limited_number' as period_type,
      50 as max_redemptions,
      NOW() as start_date,
      NOW() + INTERVAL '7 days' as end_date,
      'draft' as status,
      NOW() as created_at,
      NOW() as updated_at,
      (SELECT avg_order_value * 1.5 * 50 FROM restaurant_stats) as expected_revenue
  )
  SELECT *
  FROM suggested_campaigns
  LIMIT p_count;
END;
$$;