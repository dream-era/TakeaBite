const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: rest } = await supabase.from('restaurants').select('id').limit(1).single();
  console.log("Restaurant:", rest);

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

  const { data, error } = await supabase.from('orders').insert(orderInsert).select('id');
  console.log("Insert result:", { data, error });
}
run();
