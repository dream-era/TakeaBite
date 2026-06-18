"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items: allCartItems, updateQuantity, orderType, setOrderType } = useCartStore();
  const items = allCartItems.filter(i => i.workspaceId === workspaceId && i.tableId === tableId);

  useEffect(() => {
    if (mounted && orderType === null) {
      setOrderType('eat_here');
    }
  }, [mounted, orderType, setOrderType]);

  const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const total = subtotal;

  const checkoutUrl = `/shop/${workspaceId}/table/${tableId}/checkout`;

  if (!mounted) return null;

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-[430px] w-full overflow-x-hidden border-x border-surface-variant relative shadow-2xl">
      {/* Header */}
      <header className="bg-background sticky top-0 w-full z-40 border-b border-surface-variant">
        <div className="flex justify-between items-center w-full px-4 py-4">
          <button onClick={() => router.back()} className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 flex items-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface absolute left-1/2 -translate-x-1/2">Your Cart</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </header>

      <main className="flex-grow pb-32 px-4 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center mt-20">
            <span className="material-symbols-outlined text-[64px] text-surface-variant mb-4">shopping_cart</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Cart is empty</h2>
            <p className="font-body-md text-secondary mb-8">Looks like you haven&apos;t added anything yet.</p>
            <button onClick={() => router.back()} className="px-8 py-3 bg-primary text-on-primary rounded-xl font-label-lg active:scale-95 transition-transform shadow-lg">
              Browse Menu
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-6 border border-surface-variant/50">
              <div className="flex flex-col">
                {items.map((item, index) => (
                  <div key={item.id} className={`flex gap-4 p-4 ${index !== items.length - 1 ? 'border-b border-surface-variant/50' : ''}`}>
                    <div className="w-[72px] h-[72px] shrink-0 rounded-xl overflow-hidden bg-surface-variant">
                      <FoodImage
                        imageUrl={item.imageUrl}
                        imageSlug={nameToImageSlug(item.name)}
                        itemName={item.name}
                        size="sm"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-start">
                      <h3 className="font-label-md text-on-surface line-clamp-2 leading-tight mb-1">{item.name}</h3>
                      <span className="font-price-display text-primary block mb-3">₹{(item.price || 0).toFixed(2)}</span>
                      
                      <div className="mt-auto">
                        <div className="inline-flex items-center bg-surface-variant rounded-xl h-9 overflow-hidden shadow-sm">
                          <button onClick={() => updateQuantity(item.id, workspaceId, -1)} className="w-10 h-full flex items-center justify-center text-on-surface hover:bg-surface-container-highest active:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-[20px]">remove</span>
                          </button>
                          <span className="font-bold w-8 text-center text-on-surface text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, workspaceId, 1)} className="w-10 h-full flex items-center justify-center text-on-surface hover:bg-surface-container-highest active:bg-surface-container-highest transition-colors">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="mb-6">
              <label className="font-label-md text-on-surface block mb-2">Special Instructions</label>
              <textarea 
                placeholder="E.g. No onions, extra spicy..." 
                className="w-full bg-surface-container-lowest border border-surface-variant rounded-xl p-3 font-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary resize-none"
                rows={2}
              />
            </div>

            {/* Order Type Selection */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-4 mb-6">
              <h3 className="font-label-lg text-on-surface mb-3">Order Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrderType('eat_here')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'eat_here' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-variant text-secondary bg-surface-container-lowest'}`}
                >
                  <span className="material-symbols-outlined mb-1 text-[28px]">restaurant</span>
                  <span className="font-label-lg mt-2">Eat Here</span>
                </button>
                <button
                  onClick={() => setOrderType('takeaway')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'takeaway' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-variant text-secondary bg-surface-container-lowest'}`}
                >
                  <span className="material-symbols-outlined mb-1 text-[28px]">takeout_dining</span>
                  <span className="font-label-lg mt-2">Takeaway</span>
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-4 space-y-3">
              <h3 className="font-label-lg text-on-surface mb-2">Order Summary</h3>
              <div className="flex justify-between text-secondary">
                <span className="font-body-md">Subtotal</span>
                <span className="font-body-md">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="h-px w-full dashed-separator my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-headline-md text-on-surface">Total</span>
                <span className="font-headline-md text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Sticky Bottom Checkout */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-surface shadow-[0px_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md pb-safe">
          <div className="w-full px-4 py-4 flex items-center gap-4 h-[80px]">
            <div className="flex flex-col flex-1 justify-center">
              <span className="font-label-md text-secondary uppercase tracking-wider text-xs">Total to pay</span>
              <span className="font-headline-md text-on-surface leading-tight">₹{total.toFixed(2)}</span>
            </div>
            {orderType ? (
              <Link href={checkoutUrl} className="flex-1 flex justify-center items-center h-[48px] bg-primary text-on-primary font-label-lg rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-[0.98]">
                Checkout
              </Link>
            ) : (
              <button disabled className="flex-1 flex justify-center items-center h-[48px] bg-surface-variant text-secondary font-label-lg rounded-xl cursor-not-allowed">
                Select Order Type
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
