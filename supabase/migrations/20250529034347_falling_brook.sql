-- Add token transaction history table
CREATE TABLE marketing_token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text REFERENCES restaurants(id) NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('deduct', 'recharge', 'purchase')),
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for token transactions
CREATE INDEX idx_token_transactions_restaurant 
ON marketing_token_transactions(restaurant_id);

-- Function to deduct tokens
CREATE OR REPLACE FUNCTION deduct_marketing_tokens(
  p_restaurant_id text,
  p_amount integer,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_tokens integer;
BEGIN
  -- Get current token count with row lock
  SELECT marketing_tokens INTO v_current_tokens
  FROM restaurants
  WHERE id = p_restaurant_id
  FOR UPDATE;

  -- Check if enough tokens
  IF v_current_tokens < p_amount THEN
    RETURN false;
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

  RETURN true;
END;
$$;

-- Function to recharge tokens
CREATE OR REPLACE FUNCTION recharge_marketing_tokens(
  p_restaurant_id text,
  p_amount integer,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add tokens
  UPDATE restaurants
  SET marketing_tokens = marketing_tokens + p_amount
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
    'recharge',
    p_reason
  );
END;
$$;

-- Function to handle daily token recharge (called by cron job)
CREATE OR REPLACE FUNCTION daily_token_recharge()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT id 
    FROM restaurants 
    WHERE marketing_enabled = true
  ) LOOP
    PERFORM recharge_marketing_tokens(
      r.id,
      5,
      'Daily recharge'
    );
  END LOOP;
END;
$$;

-- Modify the redeem_marketing_coupon function to deduct tokens
CREATE OR REPLACE FUNCTION redeem_marketing_coupon(
  p_code text,
  p_order_id text,
  p_total_bill numeric
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_coupon record;
  v_discount_value numeric;
  v_restaurant_id text;
BEGIN
  -- Get coupon and campaign details in a single record
  SELECT 
    c.id as coupon_id,
    c.status as coupon_status,
    mc.id as campaign_id,
    mc.type as campaign_type,
    mc.name as campaign_name,
    mc.discount_value,
    mc.restaurant_id
  INTO v_coupon
  FROM marketing_coupons c
  JOIN marketing_campaigns mc ON c.campaign_id = mc.id
  WHERE c.code = p_code AND c.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive coupon';
  END IF;

  -- Deduct tokens for redemption
  IF NOT deduct_marketing_tokens(v_coupon.restaurant_id, 10, 'Coupon redemption: ' || v_coupon.campaign_name) THEN
    RAISE EXCEPTION 'Insufficient marketing tokens';
  END IF;

  -- Calculate discount
  CASE v_coupon.campaign_type
    WHEN 'amount_off' THEN
      v_discount_value := v_coupon.discount_value;
    WHEN 'percentage_off' THEN
      v_discount_value := (p_total_bill * v_coupon.discount_value / 100);
    WHEN 'free_item' THEN
      v_discount_value := v_coupon.discount_value;
    ELSE
      v_discount_value := 0;
  END CASE;

  -- Update coupon
  UPDATE marketing_coupons
  SET 
    status = 'redeemed',
    redeemed_at = now(),
    order_id = p_order_id,
    redemption_value = v_discount_value,
    total_bill = p_total_bill
  WHERE code = p_code;

  -- Return redemption details
  RETURN jsonb_build_object(
    'discount_value', v_discount_value,
    'campaign_type', v_coupon.campaign_type,
    'campaign_name', v_coupon.campaign_name
  );
END;
$$;