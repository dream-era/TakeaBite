-- Description: Standardize order_type column to only accept 'eat_here' and 'takeaway'

-- 1. Drop any old constraints so we can freely update the data
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- 2. Convert any existing 'dine_in' data back to 'eat_here'
UPDATE orders SET order_type = 'eat_here' WHERE order_type = 'dine_in';

-- 3. Set the default value to 'eat_here'
ALTER TABLE orders ALTER COLUMN order_type SET DEFAULT 'eat_here';

-- 4. Add strictly enforced new constraint
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('eat_here', 'takeaway'));
