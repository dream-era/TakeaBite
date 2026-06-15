import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found');
    return;
  }
  
  const client = new Client({ connectionString });
  await client.connect();
  
  const sql = fs.readFileSync(path.join(__dirname, 'src/supabase/migrations/022_cook_assignment.sql'), 'utf-8');
  
  try {
    await client.query(sql);
    console.log('Migration 022 executed successfully.');
  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}

run();
