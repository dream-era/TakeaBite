import type { Metadata } from "next";
import { Inter, Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import "./globals.css";

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
  title: "TakeaBite — Transform Your Business Into a Smart Digital Experience",
  description:
    "TakeaBite is the all-in-one premium SaaS platform to digitize operations and streamline workflows for modern businesses. QR ordering, real-time workflow, staff coordination, and instant payments.",
  keywords: [
    "restaurant management",
    "digital menu",
    "QR ordering",
    "SaaS platform",
    "business digitization",
    "TakeaBite",
  ],
  openGraph: {
    title: "TakeaBite — Smart Digital Experience for Businesses",
    description:
      "Digitize operations and streamline workflows with TakeaBite's all-in-one premium platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${beVietnamPro.variable} ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fonts.googleapis.com"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fonts.googleapis.com"} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL,GRAD,opsz@400,0..1,0,24&display=swap" rel="stylesheet" />
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
      </body>
    </html>
  );
}
