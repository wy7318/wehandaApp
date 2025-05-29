-- Enable marketing and load initial tokens for all restaurants
UPDATE restaurants 
SET 
  marketing_tokens = 1000,
  marketing_enabled = true;

-- Record token transactions for initial load
INSERT INTO marketing_token_transactions (
  restaurant_id,
  amount,
  type,
  reason
)
SELECT 
  id as restaurant_id,
  1000 as amount,
  'recharge' as type,
  'Initial token allocation' as reason
FROM restaurants;