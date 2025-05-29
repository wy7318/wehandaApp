-- Update generate_suggested_campaigns function with better revenue calculations
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
  v_repeat_rate numeric;
  v_avg_items_per_order numeric;
  v_top_item_name text;
  v_top_item_price numeric;
BEGIN
  -- Get detailed restaurant statistics
  WITH order_stats AS (
    SELECT 
      AVG(total) as avg_total,
      COUNT(DISTINCT customer_id) as unique_customers,
      COUNT(*) / COUNT(DISTINCT customer_id)::numeric as visits_per_customer,
      AVG((SELECT COUNT(*) FROM jsonb_array_elements(cart)) + 0.0) as items_per_order
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    AND created_date >= NOW() - INTERVAL '30 days'
  ),
  top_selling_item AS (
    SELECT 
      name,
      AVG(price) as avg_price
    FROM dishes
    WHERE restaurant_id = p_restaurant_id
    GROUP BY name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT 
    os.avg_total,
    os.unique_customers,
    os.visits_per_customer,
    os.items_per_order,
    tsi.name,
    tsi.avg_price
  INTO 
    v_avg_order_value,
    v_customer_count,
    v_repeat_rate,
    v_avg_items_per_order,
    v_top_item_name,
    v_top_item_price
  FROM order_stats os
  CROSS JOIN top_selling_item tsi;

  -- Generate campaigns with data-driven calculations
  RETURN QUERY
  
  -- Amount off campaign
  SELECT
    'Special Discount'::text as name,
    'Get $' || ROUND(v_avg_order_value * 0.2, 2)::text || ' off your order'::text as description,
    'amount_off'::text as type,
    ROUND(v_avg_order_value * 0.2, 2) as discount_value,
    NULL::text as free_item_name,
    'limited_number'::text as period_type,
    GREATEST(50, v_customer_count / 10) as max_redemptions,
    NOW() as start_date,
    NOW() + INTERVAL '7 days' as end_date,
    -- Expected revenue calculation:
    -- (Average order - discount) * Expected redemptions * Increased visit probability
    ROUND(
      (v_avg_order_value - (v_avg_order_value * 0.2)) * 
      GREATEST(50, v_customer_count / 10) * 
      1.2, -- Assuming 20% increase in visit probability
      2
    ) as expected_revenue
  
  UNION ALL
  
  -- Percentage off campaign
  SELECT
    'Percentage Deal'::text,
    'Save 15% on your entire order'::text,
    'percentage_off'::text,
    15.0,
    NULL,
    'date_range'::text,
    NULL,
    NOW(),
    NOW() + INTERVAL '14 days',
    -- Expected revenue calculation:
    -- (Average order * (1 - discount)) * (Customers * Visit rate * Campaign duration)
    ROUND(
      (v_avg_order_value * 0.85) * 
      (v_customer_count * v_repeat_rate * 2), -- 2 weeks duration
      2
    ) as expected_revenue
  
  UNION ALL
  
  -- BOGO campaign
  SELECT
    'Buy One Get One Free'::text,
    'Buy any ' || v_top_item_name || ' and get one free'::text,
    'bogo'::text,
    v_top_item_price,
    v_top_item_name,
    'limited_number'::text,
    GREATEST(25, v_customer_count / 20),
    NOW(),
    NOW() + INTERVAL '10 days',
    -- Expected revenue calculation:
    -- ((Average order + Extra items) - Free item cost) * Expected redemptions
    ROUND(
      ((v_avg_order_value + (v_avg_items_per_order * v_top_item_price)) - v_top_item_price) * 
      GREATEST(25, v_customer_count / 20),
      2
    ) as expected_revenue
  
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql;

-- Update deduct_marketing_tokens function to handle campaign declines
CREATE OR REPLACE FUNCTION deduct_marketing_tokens(
  p_restaurant_id text,
  p_amount integer,
  p_reason text,
  p_generate_suggestion boolean DEFAULT false
)
RETURNS TABLE (
  success boolean,
  new_suggestion json
) AS $$
DECLARE
  v_current_tokens integer;
  v_new_suggestion record;
BEGIN
  -- Get current token count with row lock
  SELECT marketing_tokens INTO v_current_tokens
  FROM restaurants
  WHERE id = p_restaurant_id
  FOR UPDATE;

  -- Check if enough tokens
  IF v_current_tokens < p_amount THEN
    RETURN QUERY SELECT false, NULL::json;
    RETURN;
  END IF;

  -- Deduct tokens
  UPDATE restaurants
  SET marketing_tokens = marketing_tokens - p_amount
  WHERE id = p_restaurant_id;

  -- Record transaction
  INSERT INTO marketing_token_transactions (
    restaurant_id,
    amount,
    type,
    reason
  ) VALUES (
    p_restaurant_id,
    p_amount,
    'deduct',
    p_reason
  );

  -- Generate new suggestion if requested
  IF p_generate_suggestion THEN
    SELECT row_to_json(s) INTO v_new_suggestion
    FROM (
      SELECT * FROM generate_suggested_campaigns(p_restaurant_id, 1) LIMIT 1
    ) s;
  END IF;

  RETURN QUERY SELECT true, v_new_suggestion::json;
END;
$$ LANGUAGE plpgsql;