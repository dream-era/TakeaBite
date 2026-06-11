export const SEO_CONFIG = {
  defaultTitle: "TakeaBite — Transform Your Business Into a Smart Digital Experience",
  defaultDescription: "TakeaBite is the all-in-one premium SaaS platform to digitize operations and streamline workflows for modern businesses. QR ordering, real-time workflow, staff coordination, and instant payments.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://takea-bite.vercel.app",
  twitterHandle: "@TakeaBiteHQ", // Replace with your actual handle
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "TakeaBite",
  },
  keywords: [
    "restaurant management",
    "digital menu",
    "QR ordering",
    "SaaS platform",
    "business digitization",
    "TakeaBite",
    "POS system",
    "kitchen display system"
  ],
};

// You can add these to your .env.local and Vercel Environment Variables
export const ENV_VARS = {
  gaId: process.env.NEXT_PUBLIC_GA_ID, // Google Analytics Measurement ID (G-XXXXXXXXXX)
  gtmId: process.env.NEXT_PUBLIC_GTM_ID, // Google Tag Manager ID (GTM-XXXXXXX)
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "clGF_WNldb9D_QpRdj4w6M5Cyq5TrHZqpfjxFf7JGSk", // GSC verification code
};
