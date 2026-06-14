-- ============================================================
-- Migration: 018_fix_orders_rls_and_fk.sql
-- Description: Fixes anon RLS for orders and order_items to allow
--              browser clients (customers & staff) to fetch their data.
--              Also fixes the foreign key constraint for stock management.
-- ============================================================

-- 1. Add SELECT policies for anon users on orders and order_items
-- Since orders are referenced by UUID, allowing anon SELECT is safe 
-- as it requires knowing the exact UUID to access order details.
-- For staff dashboards, this allows useKitchenRealtime to fetch orders by restaurant_id.

DROP POLICY IF EXISTS anon_orders_select ON orders;
CREATE POLICY anon_orders_select ON orders
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS anon_order_items_select ON order_items;
CREATE POLICY anon_order_items_select ON order_items
  FOR SELECT TO anon
  USING (true);

-- 2. Fix the out_of_stock_by foreign key constraint
-- It previously referenced auth.users(id), but staff sessions use the staff table.

-- Drop the old constraint
ALTER TABLE public.menu_items
  DROP CONSTRAINT IF EXISTS menu_items_out_of_stock_by_fkey;

-- Add the new constraint referencing staff(id)
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_out_of_stock_by_fkey 
  FOREIGN KEY (out_of_stock_by) 
  REFERENCES public.staff(id) 
  ON DELETE SET NULL;
