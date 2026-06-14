import React from 'react';
import Link from 'next/link';

interface StickyCartButtonProps {
  itemCount: number;
  totalPrice: number;
  checkoutUrl: string;
}

export function StickyCartButton({ itemCount, totalPrice, checkoutUrl }: StickyCartButtonProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 pointer-events-none">
      <Link href={checkoutUrl} className="block pointer-events-auto animate-fade-in-up">
        <div className="bg-primary text-on-primary rounded-xl p-4 shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
              {itemCount}
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-sm opacity-90">Total</span>
              <span className="font-price-display text-lg">${(totalPrice || 0).toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 font-label-lg">
            View Cart
            <span className="material-symbols-outlined">shopping_cart_checkout</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
