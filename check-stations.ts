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
  const { data: menuItems, error } = await supabase
    .from('menu_items')
    .select('name, station')
    .order('name');
  
  if (error) console.error(error);
  console.log('Menu Items stations:', menuItems);

  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, station, menu_items(name)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('Recent order items stations:', orderItems);
}
check();
