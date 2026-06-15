-- Migration: 019_fix_order_type.sql
-- Description: Drop the old order_type check constraint and add one that allows 'eat_here' and 'takeaway'. Update existing data.

-- 1. Drop existing constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- 2. Update existing data from 'dine_in' to 'eat_here'
UPDATE orders SET order_type = 'eat_here' WHERE order_type = 'dine_in';

-- 3. Update the default value to 'eat_here'
ALTER TABLE orders ALTER COLUMN order_type SET DEFAULT 'eat_here';

-- 4. Add the new constraint
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('eat_here', 'takeaway'));
