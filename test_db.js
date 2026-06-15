const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: rest } = await supabase.from('restaurants').select('id').limit(1).single();
  const orderInsert = {
    restaurant_id: rest.id,
    table_id: null,
    order_token: '123456',
    status: 'pending',
    total_amount: 10,
    payment_method: 'cash',
    payment_status: 'pending',
    order_type: 'takeaway'
  };
  const { error } = await supabase.from('orders').insert(orderInsert);
  console.log("Insert Takeaway Error:", error);

  const orderInsertDine = { ...orderInsert, order_type: 'dine_in' };
  const { error: err2 } = await supabase.from('orders').insert(orderInsertDine);
  console.log("Insert DineIn Error:", err2);
  
  const orderInsertEat = { ...orderInsert, order_type: 'eat_here' };
  const { error: err3 } = await supabase.from('orders').insert(orderInsertEat);
  console.log("Insert EatHere Error:", err3);
}
run();
