/*
  # Fix deduct_marketing_tokens function return type

  1. Changes
    - Modify deduct_marketing_tokens function to properly return JSON
    - Ensure proper JSON structure for success and new suggestion data
*/

CREATE OR REPLACE FUNCTION public.deduct_marketing_tokens(
  p_restaurant_id text,
  p_amount integer,
  p_reason text,
  p_generate_suggestion boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_tokens integer;
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
      'message', 'Insufficient tokens',
      'new_suggestion', null
    );
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
    SELECT to_jsonb(suggestion.*) INTO v_new_suggestion
    FROM generate_suggested_campaigns(p_restaurant_id, 1) suggestion
    LIMIT 1;
  END IF;

  -- Return success response with optional new suggestion
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tokens deducted successfully',
    'new_suggestion', v_new_suggestion
  );
END;
$$;