-- ============================================================
-- MENUQR — MIGRATION 002
-- Add universal_qr_url and make table_id nullable in orders
-- ============================================================

-- 1. Add universal_qr_url to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS universal_qr_url TEXT;

-- 2. Make table_id optional in orders table (for Takeaway/Counter orders via Universal QR)
ALTER TABLE orders
ALTER COLUMN table_id DROP NOT NULL;
