import { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/lib/seo-config';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all active restaurants to include in sitemap
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, updated_at')
    .eq('is_active', true);

  const baseUrl = SEO_CONFIG.siteUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    // Optional static routes if you add them later
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    }
  ];

  const restaurantRoutes: MetadataRoute.Sitemap = (restaurants || []).map((restaurant) => ({
    url: `${baseUrl}/shop/${restaurant.id}`,
    lastModified: new Date(restaurant.updated_at || new Date()),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  return [...staticRoutes, ...restaurantRoutes];
}
