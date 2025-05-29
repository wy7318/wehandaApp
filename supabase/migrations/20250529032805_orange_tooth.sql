-- Create marketing_campaigns table
CREATE TABLE marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id text REFERENCES restaurants(id) NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('amount_off', 'percentage_off', 'free_item', 'bogo')),
  discount_value numeric(10,2),
  free_item_name text,
  period_type text NOT NULL CHECK (period_type IN ('limited_number', 'date_range', 'unlimited')),
  max_redemptions integer,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'expired', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  expected_revenue numeric(10,2),
  target_audience text[] -- Array of customer types to target
);

-- Create marketing_coupons table
CREATE TABLE marketing_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES marketing_campaigns(id) NOT NULL,
  code text NOT NULL UNIQUE,
  customer_id text REFERENCES wehanda_customers(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  issued_at timestamp with time zone DEFAULT now(),
  redeemed_at timestamp with time zone,
  order_id text REFERENCES orders(id),
  redemption_value numeric(10,2), -- Actual discount amount applied
  total_bill numeric(10,2) -- Total bill amount when redeemed
);

-- Create marketing_customer_preferences table
CREATE TABLE marketing_customer_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text REFERENCES wehanda_customers(id) NOT NULL,
  email_opt_in boolean DEFAULT true,
  preferred_categories text[],
  last_notification_sent timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create marketing_campaign_stats table (materialized view)
CREATE MATERIALIZED VIEW marketing_campaign_stats AS
SELECT 
  mc.id as campaign_id,
  mc.restaurant_id,
  mc.name as campaign_name,
  mc.type as campaign_type,
  COUNT(mk.id) as total_coupons_issued,
  COUNT(CASE WHEN mk.status = 'redeemed' THEN 1 END) as total_redemptions,
  COALESCE(SUM(mk.redemption_value), 0) as total_discount_value,
  COALESCE(SUM(mk.total_bill), 0) as total_revenue,
  COALESCE(AVG(mk.total_bill), 0) as average_order_value
FROM marketing_campaigns mc
LEFT JOIN marketing_coupons mk ON mc.id = mk.campaign_id
GROUP BY mc.id, mc.restaurant_id, mc.name, mc.type;

-- Create indexes
CREATE INDEX idx_marketing_campaigns_restaurant ON marketing_campaigns(restaurant_id);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_coupons_campaign ON marketing_coupons(campaign_id);
CREATE INDEX idx_marketing_coupons_customer ON marketing_coupons(customer_id);
CREATE INDEX idx_marketing_coupons_code ON marketing_coupons(code);
CREATE INDEX idx_marketing_customer_prefs ON marketing_customer_preferences(customer_id);

-- Enable RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_customer_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view marketing campaigns for their restaurants"
  ON marketing_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = marketing_campaigns.restaurant_id
    )
  );

CREATE POLICY "Users can manage marketing campaigns for their restaurants"
  ON marketing_campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_restaurants
      WHERE user_restaurants.user_id = auth.uid()
      AND user_restaurants.restaurant_id = marketing_campaigns.restaurant_id
    )
  );

CREATE POLICY "Users can view coupons for their campaigns"
  ON marketing_coupons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marketing_campaigns mc
      JOIN user_restaurants ur ON mc.restaurant_id = ur.restaurant_id
      WHERE ur.user_id = auth.uid()
      AND mc.id = marketing_coupons.campaign_id
    )
  );

-- Create functions
CREATE OR REPLACE FUNCTION generate_unique_coupon_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text[] := ARRAY['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','2','3','4','5','6','7','8','9'];
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || chars[1 + floor(random() * array_length(chars, 1))];
    IF i = 4 THEN
      result := result || '-';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

-- Function to create a new coupon
CREATE OR REPLACE FUNCTION create_marketing_coupon(
  p_campaign_id uuid,
  p_customer_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_coupon_id uuid;
  v_code text;
  v_campaign_status text;
  v_max_redemptions integer;
  v_current_redemptions integer;
BEGIN
  -- Check campaign status and limits
  SELECT 
    status,
    max_redemptions,
    (SELECT COUNT(*) FROM marketing_coupons WHERE campaign_id = p_campaign_id)
  INTO v_campaign_status, v_max_redemptions, v_current_redemptions
  FROM marketing_campaigns
  WHERE id = p_campaign_id;

  IF v_campaign_status != 'active' THEN
    RAISE EXCEPTION 'Campaign is not active';
  END IF;

  IF v_max_redemptions IS NOT NULL AND v_current_redemptions >= v_max_redemptions THEN
    RAISE EXCEPTION 'Maximum number of coupons reached';
  END IF;

  -- Generate unique code
  LOOP
    v_code := generate_unique_coupon_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM marketing_coupons WHERE code = v_code);
  END LOOP;

  -- Create coupon
  INSERT INTO marketing_coupons (campaign_id, code, customer_id)
  VALUES (p_campaign_id, v_code, p_customer_id)
  RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$;

-- Function to redeem a coupon
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
BEGIN
  -- Get coupon and campaign details in a single record
  SELECT 
    c.id as coupon_id,
    c.status as coupon_status,
    mc.id as campaign_id,
    mc.type as campaign_type,
    mc.name as campaign_name,
    mc.discount_value
  INTO v_coupon
  FROM marketing_coupons c
  JOIN marketing_campaigns mc ON c.campaign_id = mc.id
  WHERE c.code = p_code AND c.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive coupon';
  END IF;

  -- Calculate discount
  CASE v_coupon.campaign_type
    WHEN 'amount_off' THEN
      v_discount_value := v_coupon.discount_value;
    WHEN 'percentage_off' THEN
      v_discount_value := (p_total_bill * v_coupon.discount_value / 100);
    WHEN 'free_item' THEN
      -- Assume free item value is stored in discount_value
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

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_customer_preferences_updated_at
  BEFORE UPDATE ON marketing_customer_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();