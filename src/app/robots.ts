import { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/lib/seo-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/', 
        '/servant-dashboard/', 
        '/server-dashboard/', 
        '/cashier-dashboard/', 
        '/cook-dashboard/', 
        '/juice-dashboard/', 
        '/api/', 
        '/onboarding/'
      ],
    },
    sitemap: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
  };
}
