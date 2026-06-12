export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';

// This route should be triggered daily at 00:00 Asia/Kolkata
export async function GET(request: Request) {
  // Verify authorization header if VERCEL_CRON_SECRET is set
  const authHeader = request.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminSupabase();

    // Reset is_out_of_stock for all items
    const { data, error } = await supabase
      .from('menu_items')
      .update({
        is_out_of_stock: false,
        out_of_stock_by: null,
        out_of_stock_at: null,
        out_of_stock_reason: null
      })
      .eq('is_out_of_stock', true);

    if (error) {
      console.error('[CRON] Failed to reset stock:', error);
      return NextResponse.json({ error: 'Failed to reset stock', details: error }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Stock reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CRON] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}
