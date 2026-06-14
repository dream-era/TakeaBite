import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const sql = fs.readFileSync(path.join(__dirname, 'src/supabase/migrations/018_fix_orders_rls_and_fk.sql'), 'utf-8');
  
  // Split the SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('-- ='));
    
  for (const stmt of statements) {
    if (stmt.startsWith('--')) continue; // skip pure comments
    console.log('Executing:', stmt.substring(0, 50) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    if (error) {
      console.error('Error executing SQL (may not have exec_sql RPC?):', error);
      break;
    }
  }
  console.log('Done');
}

run();
