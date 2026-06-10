import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .ilike('phone', '%8778620977%');
    
  console.log("Staff records:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

checkStaff();
