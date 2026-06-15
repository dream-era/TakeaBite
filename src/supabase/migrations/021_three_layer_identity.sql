-- ============================================================
-- Migration: 021_three_layer_identity.sql
-- Description: Replaces device_uid with 3-layer identity system:
--              1. phone (cross-device identifier)
--              2. device_cookie (browser persistent identifier)
--              3. order_token (unique shareable url identifier)
-- ============================================================

-- Add new columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS device_cookie TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_token TEXT UNIQUE;

-- Create fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_device_cookie ON orders(device_cookie);
CREATE INDEX IF NOT EXISTS idx_orders_order_token ON orders(order_token);

-- Remove old localStorage identifier columns
ALTER TABLE orders DROP COLUMN IF EXISTS device_uid;
ALTER TABLE orders DROP COLUMN IF EXISTS session_token;
