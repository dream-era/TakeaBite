const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/supabase/migrations');
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.sql')).sort();

let finalSql = `-- ============================================================
-- MIGRATION 013: Comprehensive Database Repair
-- Safely repairs and enforces all enums, tables, columns, indexes,
-- triggers, policies, and realtime publications.
-- ============================================================\n\n`;

const types = [
    'restaurant_plan', 'restaurant_status', 'order_status', 'payment_status',
    'payment_method', 'item_status', 'station_type', 'staff_role', 'table_status',
    'business_type', 'subscription_plan', 'subscription_status'
];

finalSql += `-- 1. Idempotent ENUM Creation\n`;
for (const type of types) {
    let vals = '';
    if (type === 'restaurant_plan') vals = "'basic', 'pro', 'enterprise'";
    else if (type === 'restaurant_status') vals = "'active', 'inactive', 'suspended'";
    else if (type === 'order_status') vals = "'pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'";
    else if (type === 'payment_status') vals = "'pending', 'paid', 'failed', 'refunded'";
    else if (type === 'payment_method') vals = "'online', 'cash'";
    else if (type === 'item_status') vals = "'pending', 'preparing', 'done'";
    else if (type === 'station_type') vals = "'food', 'juice', 'both'";
    else if (type === 'staff_role') vals = "'owner', 'chef', 'juice', 'server'";
    else if (type === 'table_status') vals = "'available', 'occupied', 'inactive'";
    else if (type === 'business_type') vals = "'individual', 'proprietorship', 'partnership', 'private_limited'";
    else if (type === 'subscription_plan') vals = "'starter', 'growth', 'pro'";
    else if (type === 'subscription_status') vals = "'trial', 'active', 'expired', 'cancelled'";
    
    finalSql += `DO $$ BEGIN
    CREATE TYPE ${type} AS ENUM (${vals});
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;\n\n`;
}

// Helper function
finalSql += `-- 2. Functions\n`;
finalSql += `CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n`;

// Read 001_initial and extract tables
const initialSql = fs.readFileSync(path.join(srcDir, '001_initial.sql'), 'utf8');

// Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
let tablesSql = initialSql.match(/CREATE TABLE [\s\S]*?\);/g);
if (tablesSql) {
    finalSql += `-- 3. Tables\n`;
    tablesSql.forEach(table => {
        let safeTable = table.replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS');
        finalSql += safeTable + '\n\n';
    });
}

// Add categories table
const categoriesSql = fs.readFileSync(path.join(srcDir, '008_categories.sql'), 'utf8');
let catTable = categoriesSql.match(/CREATE TABLE menu_categories [\s\S]*?\);/g);
if (catTable) {
    finalSql += catTable[0].replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS') + '\n\n';
}

finalSql += `-- 4. Alter Tables (Subscription Columns)\n`;
finalSql += `ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS current_plan subscription_plan NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS sub_status subscription_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_beta_user BOOLEAN NOT NULL DEFAULT FALSE;\n\n`;
  
// From 009 add order type
finalSql += `ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'dine_in';\n\n`;
// From 005 add contact email
finalSql += `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_email TEXT;\n\n`;

// Indexes
finalSql += `-- 5. Indexes\n`;
const indexes = initialSql.match(/CREATE INDEX.*?;/g) || [];
indexes.forEach(idx => {
    finalSql += idx.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS') + '\n';
});
finalSql += `CREATE INDEX IF NOT EXISTS idx_orders_daily_number ON orders(restaurant_id, DATE(created_at AT TIME ZONE 'Asia/Kolkata'));\n\n`;

// Triggers
finalSql += `-- 6. Triggers\n`;
const triggers = ['set_restaurants_updated_at', 'set_menu_items_updated_at', 'set_orders_updated_at', 'set_menu_categories_updated_at'];
triggers.forEach(trg => {
    let tableName = trg.split('set_')[1].split('_updated_at')[0];
    finalSql += `DROP TRIGGER IF EXISTS ${trg} ON ${tableName};\n`;
    finalSql += `CREATE TRIGGER ${trg} BEFORE UPDATE ON ${tableName} FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();\n\n`;
});

// Policies
finalSql += `-- 7. RLS Policies\n`;
const policies = initialSql.match(/CREATE POLICY [\s\S]*?;/g) || [];
policies.forEach(policy => {
    let policyNameMatch = policy.match(/CREATE POLICY (\w+) ON (\w+(?:\.\w+)?)/);
    if (policyNameMatch) {
        finalSql += `DROP POLICY IF EXISTS ${policyNameMatch[1]} ON ${policyNameMatch[2]};\n`;
        finalSql += policy + '\n\n';
    }
});

finalSql += `-- 8. Realtime Publications\n`;
const publications = ['orders', 'order_items', 'tables', 'menu_items'];
publications.forEach(pub => {
    finalSql += `DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = '${pub}'
    ) THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE ${pub}; 
    END IF; 
END $$;\n\n`;
});

finalSql += `-- 9. Storage Buckets (Safe)\n`;
finalSql += `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-codes',
  'qr-codes',
  TRUE,
  1048576,
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;\n\n`;

finalSql += `-- 10. Data Migrations\n`;
finalSql += `UPDATE restaurants 
SET 
  current_plan = CASE 
    WHEN plan = 'enterprise' THEN 'pro'::subscription_plan
    WHEN plan = 'pro' THEN 'growth'::subscription_plan
    ELSE 'starter'::subscription_plan
  END,
  sub_status = 'active'::subscription_status
WHERE current_plan = 'starter' AND sub_status = 'trial';\n\n`;

fs.writeFileSync(path.join(srcDir, '013_database_repair.sql'), finalSql);
console.log('013_database_repair.sql generated safely!');
