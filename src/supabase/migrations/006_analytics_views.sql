CREATE OR REPLACE VIEW daily_order_summary AS
SELECT
  restaurant_id,
  DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS order_date,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS total_revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(*) FILTER (WHERE payment_method = 'online') AS online_orders,
  COUNT(*) FILTER (WHERE payment_method = 'cash') AS cash_orders,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_orders
FROM orders
WHERE status NOT IN ('pending', 'cancelled')
GROUP BY restaurant_id,
  DATE(created_at AT TIME ZONE 'Asia/Kolkata');
