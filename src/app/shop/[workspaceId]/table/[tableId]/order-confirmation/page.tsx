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
import { createBrowserSupabase } from "@/lib/supabase/client";
import { PhoneRecoveryPrompt } from "@/components/customer/PhoneRecoveryPrompt";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;

  const confirmedOrder = useCartStore((s) => s.confirmedOrderDetails);
  const placedOrderId = useCartStore((s) => s.placedOrderId);

  const orderItems = confirmedOrder?.items ?? [];
  const subtotal = orderItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * item.quantity), 0);

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

  const { data: orderData, isLoading: isOrderLoading } = useQuery({
    queryKey: ['order-status', placedOrderId],
    queryFn: async () => {
      if (!placedOrderId) return null;
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase
        .from('orders')
        .select('status, payment_status, payment_method, daily_order_number')
        .eq('id', placedOrderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!placedOrderId,
    refetchInterval: (data) => {
      // Refetch every 3s if it's still pending (webhook might update it)
      if (data?.status === 'pending' || data?.payment_status === 'pending') {
        return 3000;
      }
      return false;
    }
  });

  const handleTrackOrder = () => {
    router.push(`/shop/${workspaceId}/order-tracking`);
  };

  if (!mounted) return null;

  if (isOrderLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="animate-spin material-symbols-outlined text-primary text-4xl">refresh</div>
      </div>
    );
  }

  const isOnlinePending = orderData?.payment_method === 'online' && orderData?.payment_status === 'pending';
  const isFailed = orderData?.status === 'failed' || orderData?.status === 'cancelled';

  if (isFailed || isOnlinePending) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-surface-variant text-secondary rounded-full mb-6">
          <span className="material-symbols-outlined text-5xl">
            {isFailed ? 'error' : 'hourglass_empty'}
          </span>
        </div>
        <h2 className="font-headline-xl text-on-surface mb-2">
          {isFailed ? 'Payment Failed' : 'Awaiting Payment'}
        </h2>
        <p className="font-body-lg text-secondary mb-8">
          {isFailed 
            ? 'Your payment could not be processed. Please try again.' 
            : 'We are verifying your payment. This page will refresh automatically.'}
        </p>
        <button 
          onClick={() => router.replace(`/shop/${workspaceId}`)}
          className="px-8 py-3 bg-primary text-on-primary rounded-xl font-label-lg shadow-lg"
        >
          Return to Menu
        </button>
      </div>
    );
  }

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
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] overflow-hidden max-w-md mx-auto select-none pointer-events-none" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}>
          {/* Order Meta */}
          <div className="p-6">
            <div className="flex justify-between items-start mb-element-gap-md">
              <div>
                <p className="font-label-md text-secondary uppercase tracking-wider text-[10px]">Order ID</p>
                <p className="font-headline-md text-on-surface">#{orderData?.daily_order_number ?? '...'}</p>
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
                  <span className="font-price-display text-on-surface text-base">${((item.price || 0) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="h-px w-full dashed-separator my-6"></div>
            
            {/* Pricing Calculation */}
            <div className="space-y-3">
              <div className="flex justify-between text-secondary">
                <span className="font-body-md">Subtotal</span>
                <span className="font-body-md">₹{subtotal.toFixed(2)}</span>
              </div>
              {orderData?.payment_method === 'online' && (
                <div className="flex justify-between text-secondary select-none">
                  <span className="font-body-md">Online Processing Fee (2%)</span>
                  <span className="font-body-md">₹{(subtotal * 0.02).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 select-none">
                <span className="font-headline-md text-on-surface">Grand Total</span>
                <span className="font-headline-md text-primary">
                  ₹{(orderData?.payment_method === 'online' ? subtotal * 1.02 : subtotal).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed border-surface-variant flex items-center gap-2 justify-between">
              <span className="font-label-md text-on-surface uppercase tracking-wider text-xs">Payment Method: <span className="font-bold text-primary">{orderData?.payment_method === 'cash' ? 'Cash at Counter' : 'Online'}</span></span>
              {orderData?.payment_status === 'paid' ? (
                <div className="flex items-center text-green-600 gap-1">
                  <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span className="text-xs font-bold uppercase">Success</span>
                </div>
              ) : (
                <div className="flex items-center text-orange-600 gap-1">
                  <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                  <span className="text-xs font-bold uppercase">Pending</span>
                </div>
              )}
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
          <PhoneRecoveryPrompt />
          {/* Track order removed for now */}
          <button className="w-full flex items-center justify-center gap-2 py-3 text-secondary hover:text-on-surface transition-colors font-label-md">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download Receipt
          </button>
        </div>
      </main>

      <CustomerBottomNav workspaceId={workspaceId} activeTab="orders" />
    </div>
  );
}
