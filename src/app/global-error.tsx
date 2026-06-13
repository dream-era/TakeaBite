"use client";

import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-neutral-50 flex items-center justify-center p-4`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-neutral-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <path d="M12 9v4"/>
              <path d="M12 17h.01"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3 tracking-tight">Something went wrong!</h2>
          <p className="text-neutral-500 mb-8 leading-relaxed">
            {error.message?.includes("environment variables") 
              ? "The application is missing required configuration. Please check the environment variables."
              : "We encountered an unexpected error. Please try refreshing the page."}
          </p>
          <button
            onClick={() => reset()}
            className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-red-500/20"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
