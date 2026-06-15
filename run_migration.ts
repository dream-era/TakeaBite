import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const sql = fs.readFileSync(path.join(__dirname, 'src/supabase/migrations/022_cook_assignment.sql'), 'utf-8');
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('-- ='));
    
  for (const stmt of statements) {
    if (stmt.startsWith('--') && !stmt.includes('\n')) continue;
    console.log('Executing:', stmt.substring(0, 50) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    if (error) {
      console.error('Error executing SQL:', error);
    }
  }
  console.log('Done');
}

run();
