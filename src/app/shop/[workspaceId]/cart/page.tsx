"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { CartItemCard } from "@/components/customer/CartItemCard";

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { items: allCartItems, updateQuantity, orderType, setOrderType } = useCartStore();
  const items = allCartItems.filter(i => i.workspaceId === workspaceId && i.tableId === tableId);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;

  const checkoutUrl = tableId 
    ? `/shop/${workspaceId}/table/${tableId}/checkout`
    : `/shop/${workspaceId}/checkout`;

  if (!mounted) return null;

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      {/* Header */}
      <header className="bg-background docked full-width top-0 z-40 sticky border-b border-surface-variant">
        <div className="flex justify-between items-center w-full px-container-padding py-4">
          <button onClick={() => router.back()} className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 flex items-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">Your Cart</h1>
          <div className="w-6" /> {/* Spacer */}
        </div>
      </header>

      <main className="flex-grow pb-32 px-container-padding py-6">
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
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden mb-6">
              <div className="p-4 space-y-4">
                {items.map(item => (
                  <CartItemCard key={item.id} item={item} workspaceId={workspaceId} updateQuantity={updateQuantity} />
                ))}
              </div>
            </div>

            {/* Order Type Selection */}
            <div className="mb-6">
              <h3 className="font-label-lg text-on-surface mb-3">Order Type</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'dine_in' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-variant text-secondary bg-surface-container-lowest'}`}
                >
                  <span className="material-symbols-outlined mb-1 text-[28px]">restaurant</span>
                  <span className="font-label-md">Dine In</span>
                </button>
                <button
                  onClick={() => setOrderType('takeaway')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${orderType === 'takeaway' ? 'border-primary bg-primary/5 text-primary' : 'border-surface-variant text-secondary bg-surface-container-lowest'}`}
                >
                  <span className="material-symbols-outlined mb-1 text-[28px]">takeout_dining</span>
                  <span className="font-label-md">Takeaway</span>
                </button>
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
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-surface shadow-[0px_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md pb-safe">
          <div className="max-w-md mx-auto p-4 flex items-center gap-4">
            <div className="flex flex-col flex-1">
              <span className="font-label-md text-secondary uppercase tracking-wider text-xs">Total to pay</span>
              <span className="font-headline-md text-on-surface">${total.toFixed(2)}</span>
            </div>
            {orderType ? (
              <Link href={checkoutUrl} className="flex-1 flex justify-center items-center h-14 bg-primary text-on-primary font-label-lg rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-[0.98]">
                Checkout
              </Link>
            ) : (
              <button disabled className="flex-1 flex justify-center items-center h-14 bg-surface-variant text-secondary font-label-lg rounded-xl cursor-not-allowed">
                Select Order Type
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
