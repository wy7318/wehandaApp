/*
  # Fix date comparison in customer analytics function

  1. Changes
    - Update fetch_restaurant_customer_analytics function to properly handle date comparisons
    - Add proper type casting for date fields
    - Ensure all date comparisons use consistent types

  2. Security
    - Maintain existing security policies
    - Function remains accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.fetch_restaurant_customer_analytics(
  restaurant_id text,
  start_date text DEFAULT NULL,
  end_date text DEFAULT NULL
)
RETURNS TABLE (
  total_customers bigint,
  new_customers bigint,
  returning_customers bigint,
  average_visits numeric,
  visit_frequency jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH customer_visits AS (
    SELECT 
      c.id,
      MIN(o.created_date::date) as first_visit,
      COUNT(*) as visit_count
    FROM wehanda_customers c
    JOIN orders o ON o.customer_id = c.id
    WHERE 
      o.restaurant_id = fetch_restaurant_customer_analytics.restaurant_id
      AND (
        start_date IS NULL 
        OR o.created_date::date >= start_date::date
      )
      AND (
        end_date IS NULL 
        OR o.created_date::date <= end_date::date
      )
    GROUP BY c.id
  ),
  visit_ranges AS (
    SELECT
      CASE 
        WHEN visit_count = 1 THEN 'Once'
        WHEN visit_count = 2 THEN 'Twice'
        WHEN visit_count BETWEEN 3 AND 5 THEN '3-5 times'
        WHEN visit_count BETWEEN 6 AND 10 THEN '6-10 times'
        ELSE 'More than 10 times'
      END as visit_range,
      COUNT(*) as customer_count
    FROM customer_visits
    GROUP BY 
      CASE 
        WHEN visit_count = 1 THEN 'Once'
        WHEN visit_count = 2 THEN 'Twice'
        WHEN visit_count BETWEEN 3 AND 5 THEN '3-5 times'
        WHEN visit_count BETWEEN 6 AND 10 THEN '6-10 times'
        ELSE 'More than 10 times'
      END
  )
  SELECT
    COUNT(DISTINCT cv.id) as total_customers,
    COUNT(DISTINCT CASE 
      WHEN (start_date IS NULL OR cv.first_visit >= start_date::date)
      THEN cv.id 
      END
    ) as new_customers,
    COUNT(DISTINCT CASE 
      WHEN (start_date IS NOT NULL AND cv.first_visit < start_date::date)
      THEN cv.id 
      END
    ) as returning_customers,
    ROUND(AVG(cv.visit_count)::numeric, 2) as average_visits,
    COALESCE(
      jsonb_object_agg(
        vr.visit_range, 
        vr.customer_count
      ),
      '{}'::jsonb
    ) as visit_frequency
  FROM customer_visits cv
  LEFT JOIN visit_ranges vr ON true;
END;
$$;