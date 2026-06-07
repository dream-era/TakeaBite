
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Checking restaurants table...');
  const { data, error } = await supabase.from('restaurants').select('id').limit(1);
  if (error) {
    console.error('restaurants table error:', error.message);
  } else {
    console.log('restaurants table exists! Rows:', data.length);
  }

  console.log('Checking workspaces table...');
  const { data: wData, error: wError } = await supabase.from('workspaces').select('id').limit(1);
  if (wError) {
    console.error('workspaces table error:', wError.message);
  } else {
    console.log('workspaces table exists! Rows:', wData.length);
  }
}

check();
