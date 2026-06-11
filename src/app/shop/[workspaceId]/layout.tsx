import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SEO_CONFIG } from '@/lib/seo-config';

type Props = {
  params: { workspaceId: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, description, logo_url')
    .eq('id', params.workspaceId)
    .single();

  const title = restaurant ? `${restaurant.name} | Order Online` : 'Restaurant Menu';
  const description = restaurant?.description || `View the menu and order online from ${restaurant?.name || 'this restaurant'} via TakeaBite.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: restaurant?.logo_url ? [{ url: restaurant.logo_url }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: restaurant?.logo_url ? [restaurant.logo_url] : undefined,
    },
    alternates: {
      canonical: `${SEO_CONFIG.siteUrl}/shop/${params.workspaceId}`,
    }
  };
}

export default function ShopLayout({ children }: Props) {
  return <>{children}</>;
}
