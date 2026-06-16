-- ============================================================
-- Migration: 024_production_indexes.sql
-- Description: Adds essential indexes to orders for high-traffic environments.
-- ============================================================

-- 1. Index on order_token for deep-linking scans
CREATE INDEX IF NOT EXISTS idx_orders_order_token ON public.orders(order_token);

-- 2. Index on restaurant_id and created_at for fast dashboard fetching
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at ON public.orders(restaurant_id, created_at DESC);

-- 3. Index on device_cookie for anonymous tracking lookups
CREATE INDEX IF NOT EXISTS idx_orders_device_cookie ON public.orders(device_cookie);

-- 4. Index on phone for customer order history lookups
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone);
