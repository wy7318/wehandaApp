/*
  # Fix deduct_marketing_tokens function

  1. Changes
    - Add missing table reference for suggestions in deduct_marketing_tokens function
    - Ensure proper handling of suggestion generation
*/

CREATE OR REPLACE FUNCTION public.deduct_marketing_tokens(
  p_restaurant_id TEXT,
  p_amount INTEGER,
  p_reason TEXT,
  p_generate_suggestion BOOLEAN DEFAULT FALSE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_tokens INTEGER;
  v_new_suggestion jsonb;
BEGIN
  -- Get current token count
  SELECT marketing_tokens INTO v_current_tokens
  FROM restaurants
  WHERE id = p_restaurant_id;

  -- Check if enough tokens
  IF v_current_tokens < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient tokens'
    );
  END IF;

  -- Update tokens
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
    WITH suggestion_data AS (
      SELECT 
        'New Campaign ' || floor(random() * 1000)::text as name,
        CASE floor(random() * 4)
          WHEN 0 THEN 'amount_off'
          WHEN 1 THEN 'percentage_off'
          WHEN 2 THEN 'free_item'
          ELSE 'bogo'
        END as type,
        floor(random() * 50 + 10)::numeric as discount_value,
        CASE floor(random() * 3)
          WHEN 0 THEN 'limited_number'
          WHEN 1 THEN 'date_range'
          ELSE 'unlimited'
        END as period_type,
        floor(random() * 100 + 50)::integer as max_redemptions,
        floor(random() * 1000 + 500)::numeric as expected_revenue
    )
    SELECT jsonb_build_object(
      'name', name,
      'description', 'Automatically generated campaign suggestion',
      'type', type,
      'discount_value', discount_value,
      'period_type', period_type,
      'max_redemptions', max_redemptions,
      'expected_revenue', expected_revenue
    ) INTO v_new_suggestion
    FROM suggestion_data;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_suggestion', v_new_suggestion
  );
END;
$$;