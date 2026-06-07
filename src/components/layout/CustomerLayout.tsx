"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  // This is a placeholder cart item count
  const cartItemCount = 0;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 font-sans pb-20">
      {/* Top Header Placeholder (e.g. Shop Logo & Name) */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-neutral-200 rounded-lg overflow-hidden animate-pulse"></div>
          <div>
            <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse mb-1"></div>
            <div className="h-3 w-20 bg-neutral-100 rounded animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Bottom Fixed Navigation/Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <Link 
          href={`/shop/${workspaceId}/cart`}
          className="flex items-center justify-between w-full max-w-md mx-auto bg-brand-600 hover:bg-brand-700 text-white rounded-2xl px-6 py-4 shadow-lg shadow-brand-600/30 transition-transform active:scale-95"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="font-bold">{cartItemCount} Items</span>
          </div>
          <span className="font-bold">View Cart</span>
        </Link>
      </div>
    </div>
  );
}
