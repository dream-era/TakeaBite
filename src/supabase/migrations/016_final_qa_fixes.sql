-- ============================================================
-- Migration: 016_final_qa_fixes.sql
-- Description: Adds missing columns for daily ordering, 
--              hashes, missing indexes, and realtime tables.
-- ============================================================

-- Add new columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS daily_order_number INTEGER,
ADD COLUMN IF NOT EXISTS business_date DATE,
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cash', 'online')),
ADD COLUMN IF NOT EXISTS order_hash TEXT,
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_daily_number ON public.orders(daily_order_number);
-- Note: schema uses restaurant_id or workspace_id depending on exact environment version
-- Adding the index below based on the standard column name used in code.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'restaurant_id') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
    ELSE
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(workspace_id, status);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_business_date ON public.orders(business_date);

-- Ensure publication has the missing realtime tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'menu_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items') AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    END IF;
END $$;
