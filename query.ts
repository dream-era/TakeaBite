import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseKey) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: items, error: e1 } = await supabase.from('order_items').select('id, order_id, menu_item_id, station, status').order('created_at', { ascending: false }).limit(5);
  console.log("Recent order items:", items, e1);
  
  const { data: orders, error: e2 } = await supabase.from('orders').select('id, status, restaurant_id').order('created_at', { ascending: false }).limit(5);
  console.log("Recent orders:", orders, e2);
}
check();
