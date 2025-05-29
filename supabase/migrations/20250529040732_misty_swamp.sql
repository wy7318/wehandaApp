/*
  # Fix ambiguous name column in generate_suggested_campaigns function

  1. Changes
    - Drop and recreate generate_suggested_campaigns function with qualified column names
    - Add proper table aliases to avoid column name ambiguity
    - Ensure proper return type definition
    - Add input parameter validation

  2. Security
    - Function remains accessible to authenticated users only
    - No changes to existing security policies
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS generate_suggested_campaigns;

-- Recreate the function with proper column qualification
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
  -- Input validation
  IF p_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant ID cannot be null';
  END IF;

  IF p_count <= 0 THEN
    RAISE EXCEPTION 'Count must be greater than 0';
  END IF;

  RETURN QUERY
  WITH restaurant_stats AS (
    SELECT 
      r.id AS restaurant_id,
      r.name AS restaurant_name,
      COALESCE(AVG(o.total), 0) AS avg_order_value,
      COUNT(DISTINCT o.customer_id) AS customer_count
    FROM restaurants r
    LEFT JOIN orders o ON o.restaurant_id = r.id
    WHERE r.id = p_restaurant_id
    GROUP BY r.id, r.name
  ),
  campaign_suggestions AS (
    SELECT
      CASE 
        WHEN rs.avg_order_value > 50 THEN 'Premium ' || rs.restaurant_name || ' Experience'
        ELSE 'Special Offer at ' || rs.restaurant_name
      END AS campaign_name,
      CASE 
        WHEN rs.avg_order_value > 50 THEN 'Exclusive dining experience with premium perks'
        ELSE 'Limited time special offer for our valued customers'
      END AS campaign_description,
      CASE 
        WHEN rs.avg_order_value > 50 THEN 'percentage_off'
        ELSE 'amount_off'
      END AS campaign_type,
      CASE 
        WHEN rs.avg_order_value > 50 THEN 20.00
        ELSE 10.00
      END AS discount_value,
      NULL AS free_item_name,
      'limited_number' AS period_type,
      100 AS max_redemptions,
      NOW() AS start_date,
      NOW() + INTERVAL '30 days' AS end_date,
      CASE 
        WHEN rs.avg_order_value > 50 THEN rs.avg_order_value * 1.5
        ELSE rs.avg_order_value * 1.2
      END AS expected_revenue
    FROM restaurant_stats rs
    UNION ALL
    SELECT
      'BOGO at ' || rs.restaurant_name AS campaign_name,
      'Buy one get one free on selected items' AS campaign_description,
      'bogo' AS campaign_type,
      NULL AS discount_value,
      'Selected Items' AS free_item_name,
      'date_range' AS period_type,
      NULL AS max_redemptions,
      NOW() AS start_date,
      NOW() + INTERVAL '14 days' AS end_date,
      rs.avg_order_value * 1.3 AS expected_revenue
    FROM restaurant_stats rs
    UNION ALL
    SELECT
      'Flash Sale at ' || rs.restaurant_name AS campaign_name,
      'Limited time flash sale with amazing discounts' AS campaign_description,
      'percentage_off' AS campaign_type,
      15.00 AS discount_value,
      NULL AS free_item_name,
      'date_range' AS period_type,
      NULL AS max_redemptions,
      NOW() AS start_date,
      NOW() + INTERVAL '7 days' AS end_date,
      rs.avg_order_value * 1.4 AS expected_revenue
    FROM restaurant_stats rs
  )
  SELECT 
    cs.campaign_name AS name,
    cs.campaign_description AS description,
    cs.campaign_type AS type,
    cs.discount_value,
    cs.free_item_name,
    cs.period_type,
    cs.max_redemptions,
    cs.start_date,
    cs.end_date,
    cs.expected_revenue
  FROM campaign_suggestions cs
  LIMIT p_count;
END;
$$;