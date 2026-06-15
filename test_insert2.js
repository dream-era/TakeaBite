const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: restaurant, error: rErr } = await supabase.from('restaurants').select('*').limit(1).single();
  if (rErr) return console.log('Restaurant fetch error:', rErr);

  const { data: table, error: tErr } = await supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).limit(1).single();

  const testOrder = {
    restaurant_id: restaurant.id,
    table_id: table?.id || null,
    device_uid: 'test_uid',
    session_token: 'test_token',
    status: 'confirmed',
    total_amount: 50.00,
    payment_method: 'cash',
    payment_status: 'pending',
    order_hash: 'testhash2',
    order_type: 'dine_in', // CHANGED FROM 'eat_here'
    daily_order_number: 9998
  };

  console.log('Attempting insert with dine_in...');
  const { data, error } = await supabase.from('orders').insert(testOrder).select();
  if (error) {
    console.log('INSERT ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('INSERT SUCCESS:', data);
    await supabase.from('orders').delete().eq('id', data[0].id);
  }
}

test();
