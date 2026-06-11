import type { Metadata } from "next";
import { Inter, Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import "./globals.css";

import { SEO_CONFIG, ENV_VARS } from "@/lib/seo-config";
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: SEO_CONFIG.defaultTitle,
    template: `%s | TakeaBite`,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: SEO_CONFIG.keywords,
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    ...SEO_CONFIG.openGraph,
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    url: SEO_CONFIG.siteUrl,
    images: [
      {
        url: '/og-image.jpg', // You can add an actual image at public/og-image.jpg
        width: 1200,
        height: 630,
        alt: 'TakeaBite Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    creator: SEO_CONFIG.twitterHandle,
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: ENV_VARS.googleSiteVerification,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "TakeaBite",
        "url": SEO_CONFIG.siteUrl,
        "logo": `${SEO_CONFIG.siteUrl}/favicon.ico`,
        "sameAs": [
          "https://twitter.com/TakeaBiteHQ"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "TakeaBite Platform",
        "operatingSystem": "Web",
        "applicationCategory": "BusinessApplication",
        "offers": {
          "@type": "Offer",
          "price": "299",
          "priceCurrency": "INR"
        }
      },
      {
        "@type": "WebSite",
        "name": "TakeaBite",
        "url": SEO_CONFIG.siteUrl
      }
    ]
  };

  return (
    <html lang="en" className={`${inter.variable} ${beVietnamPro.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fonts.googleapis.com"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fonts.googleapis.com"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0..1,0,24&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#262626",
              color: "#fafafa",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        {ENV_VARS.gaId && <GoogleAnalytics gaId={ENV_VARS.gaId} />}
      </body>
    </html>
  );
}
