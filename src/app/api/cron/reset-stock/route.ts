import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase';

// This is a secure endpoint meant to be called by Vercel Cron.
// Vercel sends a specific Authorization header with CRON_SECRET.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    // In production, Vercel sets this env var and sends it in the header
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createAdminSupabase();

    // Reset all menu items to be in stock
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: true })
      .eq('is_available', false); // Only update items that are currently out of stock

    if (error) {
      console.error("[cron/reset-stock] Error resetting stock:", error);
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Stock successfully reset" });
  } catch (error: any) {
    console.error("[cron/reset-stock] Exception:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
