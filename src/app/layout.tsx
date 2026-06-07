import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable}>
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
