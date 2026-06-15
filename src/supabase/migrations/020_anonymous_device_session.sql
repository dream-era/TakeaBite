-- Migration: 020_anonymous_device_session.sql
-- Description: Add device_uid, session_token, and phone to orders table for anonymous customer sessions.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS device_uid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_token TEXT;

-- customer_phone already exists, but we add phone for backwards compatibility with the requested schema,
-- or we can just stick to customer_phone if that's what the app uses. Wait, the app currently uses customer_phone.
-- The user prompt said: ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_device_uid ON orders(device_uid);
CREATE INDEX IF NOT EXISTS idx_orders_session_token ON orders(session_token);
