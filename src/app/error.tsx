"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-md w-full text-center border border-neutral-100">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3 tracking-tight">Oops! Something broke.</h2>
        <p className="text-neutral-500 mb-2 leading-relaxed text-sm font-mono break-words text-left">
          {error.message}
        </p>
        {error.stack && (
          <pre className="text-left text-[10px] text-red-600 bg-red-50 p-4 rounded-lg overflow-auto max-h-64 mb-8 whitespace-pre-wrap font-mono border border-red-100">
            {error.stack}
          </pre>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            Go Home
          </button>
          <button
            onClick={() => reset()}
            className="flex-1 bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-red-500/20"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
