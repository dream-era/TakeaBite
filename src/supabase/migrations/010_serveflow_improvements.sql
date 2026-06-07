-- 1. Add daily order number column
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS daily_order_number INTEGER;

-- 2. Add order hash for tamper detection
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_hash TEXT;

-- 3. Index for fast daily number lookup
CREATE INDEX IF NOT EXISTS idx_orders_daily_number
  ON orders (restaurant_id, daily_order_number);

-- 4. Unique constraint to prevent duplicate daily numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_daily_num
  ON orders (
    restaurant_id,
    daily_order_number,
    DATE(created_at AT TIME ZONE 'Asia/Kolkata')
  )
  WHERE daily_order_number IS NOT NULL;
