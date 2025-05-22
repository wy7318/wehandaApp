/*
  # Analytics Functions

  1. New Functions
    - get_hourly_order_stats: Aggregates order data by hour
    - get_daily_order_stats: Aggregates order data by day
    - get_weekly_order_stats: Aggregates order data by week
    - get_revenue_forecast: Calculates revenue forecasts
    - get_demand_forecast: Calculates demand forecasts

  2. Changes
    - Added indexes for performance optimization
    - Added materialized views for faster analytics queries
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders(created_date);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_total ON orders(restaurant_id, total);

-- Create materialized view for hourly stats
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_order_stats AS
SELECT 
  restaurant_id,
  date_trunc('hour', created_date) as hour,
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  AVG(total) as avg_order_value,
  COUNT(DISTINCT customer_id) as unique_customers
FROM orders
GROUP BY restaurant_id, date_trunc('hour', created_date);

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_hourly_stats 
ON mv_hourly_order_stats(restaurant_id, hour);

-- Function to get hourly order statistics
CREATE OR REPLACE FUNCTION get_hourly_order_stats(
  p_restaurant_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  hour TIMESTAMP,
  order_count BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  unique_customers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hour,
    order_count,
    total_revenue,
    avg_order_value,
    unique_customers
  FROM mv_hourly_order_stats
  WHERE restaurant_id = p_restaurant_id
    AND hour BETWEEN p_start_date AND p_end_date
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql;

-- Function to get daily order statistics with moving averages
CREATE OR REPLACE FUNCTION get_daily_order_stats(
  p_restaurant_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  date DATE,
  order_count BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  moving_avg_orders NUMERIC,
  moving_avg_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      date_trunc('day', created_date)::DATE as date,
      COUNT(*) as order_count,
      SUM(total) as total_revenue,
      AVG(total) as avg_order_value
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND created_date BETWEEN p_start_date AND p_end_date
    GROUP BY date_trunc('day', created_date)
  )
  SELECT 
    s.date,
    s.order_count,
    s.total_revenue,
    s.avg_order_value,
    AVG(s.order_count) OVER (
      ORDER BY s.date 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_orders,
    AVG(s.total_revenue) OVER (
      ORDER BY s.date 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_revenue
  FROM daily_stats s
  ORDER BY s.date;
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly order statistics with growth rates
CREATE OR REPLACE FUNCTION get_weekly_order_stats(
  p_restaurant_id TEXT,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  week DATE,
  order_count BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  week_over_week_growth NUMERIC,
  revenue_growth NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH weekly_stats AS (
    SELECT 
      date_trunc('week', created_date)::DATE as week,
      COUNT(*) as order_count,
      SUM(total) as total_revenue,
      AVG(total) as avg_order_value
    FROM orders
    WHERE restaurant_id = p_restaurant_id
      AND created_date BETWEEN p_start_date AND p_end_date
    GROUP BY date_trunc('week', created_date)
  )
  SELECT 
    s.week,
    s.order_count,
    s.total_revenue,
    s.avg_order_value,
    ((s.order_count::NUMERIC / LAG(s.order_count) OVER (ORDER BY s.week)) - 1) * 100 as week_over_week_growth,
    ((s.total_revenue / LAG(s.total_revenue) OVER (ORDER BY s.week)) - 1) * 100 as revenue_growth
  FROM weekly_stats s
  ORDER BY s.week;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate revenue forecast using simple exponential smoothing
CREATE OR REPLACE FUNCTION get_revenue_forecast(
  p_restaurant_id TEXT,
  p_periods INTEGER DEFAULT 4  -- Number of periods to forecast
)
RETURNS TABLE (
  forecast_date DATE,
  forecasted_revenue NUMERIC,
  lower_bound NUMERIC,
  upper_bound NUMERIC,
  confidence_level NUMERIC
) AS $$
DECLARE
  alpha NUMERIC := 0.3;  -- Smoothing factor
BEGIN
  RETURN QUERY
  WITH historical_data AS (
    SELECT 
      date_trunc('week', created_date)::DATE as week,
      SUM(total) as weekly_revenue
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    GROUP BY week
    ORDER BY week DESC
    LIMIT 12  -- Use last 12 weeks for forecasting
  ),
  smoothed AS (
    SELECT
      week,
      weekly_revenue,
      AVG(weekly_revenue) OVER (
        ORDER BY week
        ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
      ) as smoothed_revenue,
      STDDEV(weekly_revenue) OVER (
        ORDER BY week
        ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
      ) as std_dev
    FROM historical_data
  )
  SELECT
    (week + (INTERVAL '1 week' * generate_series(1, p_periods)))::DATE as forecast_date,
    (smoothed_revenue * power(alpha, generate_series(1, p_periods)))::NUMERIC as forecasted_revenue,
    (smoothed_revenue - (1.96 * std_dev))::NUMERIC as lower_bound,
    (smoothed_revenue + (1.96 * std_dev))::NUMERIC as upper_bound,
    95::NUMERIC as confidence_level
  FROM smoothed
  ORDER BY forecast_date;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate demand forecast
CREATE OR REPLACE FUNCTION get_demand_forecast(
  p_restaurant_id TEXT,
  p_periods INTEGER DEFAULT 4  -- Number of periods to forecast
)
RETURNS TABLE (
  forecast_date DATE,
  forecasted_orders INTEGER,
  lower_bound INTEGER,
  upper_bound INTEGER,
  confidence_level NUMERIC
) AS $$
DECLARE
  alpha NUMERIC := 0.3;  -- Smoothing factor
BEGIN
  RETURN QUERY
  WITH historical_data AS (
    SELECT 
      date_trunc('week', created_date)::DATE as week,
      COUNT(*) as order_count
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    GROUP BY week
    ORDER BY week DESC
    LIMIT 12  -- Use last 12 weeks for forecasting
  ),
  smoothed AS (
    SELECT
      week,
      order_count,
      AVG(order_count) OVER (
        ORDER BY week
        ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
      ) as smoothed_count,
      STDDEV(order_count) OVER (
        ORDER BY week
        ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
      ) as std_dev
    FROM historical_data
  )
  SELECT
    (week + (INTERVAL '1 week' * generate_series(1, p_periods)))::DATE as forecast_date,
    (smoothed_count * power(alpha, generate_series(1, p_periods)))::INTEGER as forecasted_orders,
    (smoothed_count - (1.96 * std_dev))::INTEGER as lower_bound,
    (smoothed_count + (1.96 * std_dev))::INTEGER as upper_bound,
    95::NUMERIC as confidence_level
  FROM smoothed
  ORDER BY forecast_date;
END;
$$ LANGUAGE plpgsql;