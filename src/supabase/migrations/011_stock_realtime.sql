-- ============================================================
-- MIGRATION: 011_stock_realtime.sql
-- DESCRIPTION: Adds menu_items to the supabase_realtime publication
-- to allow real-time syncing of is_available (Stock Management)
-- ============================================================

-- Add menu_items to the default realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
