"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";

import { useCartStore } from "@/store/useCartStore";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";
import { useQuery } from "@tanstack/react-query";
import { getRestaurantProfile } from "@/actions/restaurant";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string || "4";

  const confirmedOrder = useCartStore((s) => s.confirmedOrderDetails);
  const placedOrderId = useCartStore((s) => s.placedOrderId);

  const orderItems = confirmedOrder?.items ?? [];
  const totalAmount = confirmedOrder?.totalAmount ?? 0;
  const tax = totalAmount * 0.02;
  const grandTotal = totalAmount + tax;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', workspaceId],
    queryFn: () => getRestaurantProfile(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data as any;
    }),
    enabled: !!workspaceId,
  });

  const handleTrackOrder = () => {
    router.push(`/shop/${workspaceId}/order-tracking`);
  };

  if (!mounted) return null;

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      <CustomerTopBar shopName={restaurantData?.name || ''} />

      <main className="flex-grow px-container-padding pb-32">
        {/* Status Header */}
        <div className="mt-section-margin text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container text-on-primary rounded-full mb-4">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl text-on-surface">Order Confirmed</h2>
          <p className="font-body-lg text-secondary mt-2">Your delicious meal is being prepared!</p>
        </div>

        {/* Receipt Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden max-w-md mx-auto">
          {/* Order Meta */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-element-gap-md">
              <div>
                <p className="font-label-md text-secondary uppercase tracking-wider text-[10px]">Order ID</p>
                <p className="font-headline-md text-on-surface">#{placedOrderId?.slice(0, 8).toUpperCase() ?? 'LOADING'}</p>
              </div>
              <div className="text-right">
                <p className="font-label-md text-secondary uppercase tracking-wider text-[10px]">Date</p>
                <p className="font-body-md text-on-surface text-sm">{new Date().toLocaleString()}</p>
              </div>
            </div>
            
            <div className="h-px w-full dashed-separator my-6"></div>
            
            {/* Items List */}
            <div className="space-y-4">
              {orderItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                      <FoodImage
                        imageSlug={nameToImageSlug(item.name)}
                        itemName={item.name}
                        size="sm"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-body-lg font-medium text-on-surface leading-tight">{item.quantity}x {item.name}</span>
                  </div>
                  <span className="font-price-display text-on-surface text-base">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="h-px w-full dashed-separator my-6"></div>
            
            {/* Pricing Calculation */}
            <div className="space-y-3">
              <div className="flex justify-between text-secondary">
                <span className="font-body-md">Subtotal</span>
                <span className="font-body-md">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-secondary">
                <span className="font-body-md">Tax (5%)</span>
                <span className="font-body-md">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-headline-md text-on-surface">Grand Total</span>
                <span className="font-headline-md text-primary">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed border-surface-variant flex items-center gap-2">
              <span className="font-label-md text-on-surface uppercase tracking-wider text-xs">Payment Details:</span>
              <div className="flex items-center text-green-600 gap-1">
                <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-xs font-bold uppercase">Success</span>
              </div>
            </div>
          </div>
          
          {/* Receipt Footer Decoration */}
          <div className="bg-surface-container-high h-2 w-full flex overflow-hidden justify-around items-end">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-2 w-4 bg-background rounded-t-full translate-y-1"></div>
            ))}
          </div>
        </div>

        {/* Primary Actions */}
        <div className="mt-section-margin max-w-md mx-auto space-y-4">
          {/* Track order removed for now */}
          <button className="w-full flex items-center justify-center gap-2 py-3 text-secondary hover:text-on-surface transition-colors font-label-md">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download Receipt
          </button>
        </div>
      </main>

      <CustomerBottomNav workspaceId={workspaceId} tableId={tableId} activeTab="orders" />
    </div>
  );
}
