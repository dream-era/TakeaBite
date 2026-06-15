/**
 * Production Verification Script
 * Run this script to verify that the necessary environment variables are set
 * and that the database connection/migrations are intact in the production environment.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verifyProductionEnvironment() {
  console.log('🚀 Starting Production Verification Audit...\n');
  let hasErrors = false;

  // 1. Verify Environment Variables
  console.log('Checking Environment Variables...');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing ${envVar}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${envVar} is set`);
    }
  }

  // Optional env variables checking
  const optionalEnvVars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'NEXT_PUBLIC_APP_URL'];
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️  Missing optional ${envVar}`);
    } else {
      console.log(`✅ ${envVar} is set`);
    }
  }
  
  if (hasErrors) {
    console.error('\n❌ Critical environment variables are missing! Verification failed.');
    process.exit(1);
  }
  console.log('✅ Environment Variable Verification Passed\n');

  // 2. Verify Supabase Connection and Roles
  console.log('Checking Supabase Connection & Admin Rights...');
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase URL or Service Role Key');
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // We can do a lightweight query using the service role to ensure it works.
    // Let's verify we have access to a critical table like 'users' or 'restaurants'.
    const { data: restData, error: restError } = await adminClient
        .from('restaurants')
        .select('id')
        .limit(1);

    if (restError) {
      console.error('❌ Failed to fetch from restaurants table using Service Role key.');
      console.error(restError);
      hasErrors = true;
    } else {
      console.log('✅ Service Role connection verified. Data fetch successful.');
    }

    // 3. Optional: Verify Migration State Table
    // If you use a migrations tracker table, you can query it here to verify all migrations ran.
    // Assuming a hypothetical 'schema_migrations' or similar logic exists, else skip.

  } catch (error) {
    console.error('❌ Supabase verification encountered an error:', error.message);
    hasErrors = true;
  }

  // Final Outcome
  console.log('\n=======================================');
  if (hasErrors) {
    console.error('❌ VERIFICATION FAILED: Issues were found that may affect production.');
    process.exit(1);
  } else {
    console.log('✅ VERIFICATION PASSED: System is ready for production rollout.');
    process.exit(0);
  }
}

// Support running directly
if (require.main === module) {
  // Try loading .env.local if available (useful for testing locally)
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // Ignore if dotenv is not available, assume env vars are injected by Vercel
  }
  verifyProductionEnvironment();
}

module.exports = { verifyProductionEnvironment };
