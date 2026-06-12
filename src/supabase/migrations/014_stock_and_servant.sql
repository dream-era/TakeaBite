-- 1. Safely add 'servant' role
ALTER TYPE public.staff_role ADD VALUE IF NOT EXISTS 'servant';

-- 2. Add stock management fields to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS out_of_stock_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS out_of_stock_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS out_of_stock_reason TEXT;

-- 3. Create an index for faster querying of out-of-stock items (useful for customer menus)
CREATE INDEX IF NOT EXISTS idx_menu_items_stock_status 
ON public.menu_items(restaurant_id, is_out_of_stock) 
WHERE is_out_of_stock = TRUE;
