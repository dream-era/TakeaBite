import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    "URL exists": !!url,
    "URL value (masked)": url ? `${url.substring(0, 8)}...` : null,
    "URL starts with http/https": url ? (url.startsWith('http://') || url.startsWith('https://')) : false,
    "Anon key exists": !!anonKey,
    "Service key exists": !!serviceKey,
  });
}
