import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('orders').insert({
    restaurant_id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
    status: 'pending',
    order_type: 'dine_in',
    total_amount: 100,
    payment_method: 'cash',
    payment_status: 'pending',
  });
  console.log('Error with order_type:', error?.message);

  const { error: error2 } = await supabase.from('orders').insert({
    restaurant_id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
    status: 'pending',
    total_amount: 100,
    payment_method: 'cash',
    payment_status: 'pending',
  });
  console.log('Error without order_type:', error2?.message);
}
test();
