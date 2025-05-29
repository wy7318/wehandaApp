-- Add marketing tokens to restaurants table
ALTER TABLE restaurants 
ADD COLUMN marketing_tokens integer DEFAULT 0,
ADD COLUMN marketing_enabled boolean DEFAULT false;

-- Create function to generate suggested marketing campaigns
CREATE OR REPLACE FUNCTION generate_suggested_campaigns(
  p_restaurant_id text,
  p_count integer DEFAULT 3
)
RETURNS TABLE (
  name text,
  description text,
  type text,
  discount_value numeric(10,2),
  free_item_name text,
  period_type text,
  max_redemptions integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  expected_revenue numeric(10,2)
) AS $$
DECLARE
  v_avg_order_value numeric;
  v_customer_count integer;
  v_menu_items text[];
BEGIN
  -- Get restaurant statistics
  SELECT 
    COALESCE(AVG(total), 0),
    COUNT(DISTINCT customer_id)
  INTO v_avg_order_value, v_customer_count
  FROM orders
  WHERE restaurant_id = p_restaurant_id
  AND created_date >= NOW() - INTERVAL '30 days';

  -- Generate different types of campaigns
  RETURN QUERY
  SELECT
    -- Amount off campaign
    'Special Discount'::text as name,
    'Get $' || ROUND(v_avg_order_value * 0.2, 2)::text || ' off your order'::text as description,
    'amount_off'::text as type,
    ROUND(v_avg_order_value * 0.2, 2) as discount_value,
    NULL::text as free_item_name,
    'limited_number'::text as period_type,
    GREATEST(50, v_customer_count / 10) as max_redemptions,
    NOW() as start_date,
    NOW() + INTERVAL '7 days' as end_date,
    ROUND(v_avg_order_value * 0.8 * GREATEST(50, v_customer_count / 10), 2) as expected_revenue
  UNION ALL
  SELECT
    -- Percentage off campaign
    'Percentage Deal'::text,
    'Save 15% on your entire order'::text,
    'percentage_off'::text,
    15.0,
    NULL,
    'date_range'::text,
    NULL,
    NOW(),
    NOW() + INTERVAL '14 days',
    ROUND(v_avg_order_value * 0.85 * (v_customer_count * 0.3), 2)
  UNION ALL
  SELECT
    -- BOGO campaign
    'Buy One Get One Free'::text,
    'Buy any item and get one free'::text,
    'bogo'::text,
    NULL,
    NULL,
    'limited_number'::text,
    GREATEST(25, v_customer_count / 20),
    NOW(),
    NOW() + INTERVAL '10 days',
    ROUND(v_avg_order_value * 1.5 * GREATEST(25, v_customer_count / 20), 2)
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql;