-- Create menu_categories table
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, name)
);

-- Trigger for updated_at
CREATE TRIGGER set_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-populate menu_categories from existing menu_items
INSERT INTO menu_categories (restaurant_id, name)
SELECT DISTINCT restaurant_id, category
FROM menu_items
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- Link menu_items to menu_categories via the name string
-- This establishes the relational constraint without changing frontend code!
ALTER TABLE menu_items
ADD CONSTRAINT fk_category 
FOREIGN KEY (restaurant_id, category) 
REFERENCES menu_categories (restaurant_id, name) 
ON UPDATE CASCADE 
ON DELETE RESTRICT;
