"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getRestaurantProfile } from "@/actions/restaurant";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;

  const queryClient = useQueryClient();
  const supabase = createBrowserSupabase();

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', workspaceId],
    queryFn: () => getRestaurantProfile(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data as any;
    }),
    enabled: !!workspaceId,
  });

  // Fetch recent active orders for this table
  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-orders', workspaceId, tableId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items ( name )
          )
        `)
        .eq('restaurant_id', workspaceId)
        .not('status', 'in', '("pending", "failed", "cancelled")')
        .order('created_at', { ascending: false })
        .limit(10);

      if (tableId) {
        query = query.eq('table_id', tableId);
      } else {
        query = query.is('table_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  // Supabase Realtime Subscription for Instant Updates
  useEffect(() => {
    const channel = supabase.channel('customer-tracking')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${workspaceId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-orders', workspaceId, tableId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-orders', workspaceId, tableId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, workspaceId, tableId]);

  const getStepForStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'served': return 4;
      default: return 1;
    }
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      <CustomerTopBar shopName={restaurantData?.name || ''} />

      <main className="flex-grow px-container-padding py-6 pb-32">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 flex items-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="font-headline-md text-headline-md text-on-surface">Track Order</h2>
          <div className="w-6" />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin material-symbols-outlined text-primary text-4xl">refresh</div>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20 text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
            <p>No active orders found for this table.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order: { id: string; status: string; special_instructions: string | null; table_id: string | null; created_at: string; updated_at: string; order_items: { id: string; quantity: number; price: number; menu_items: { name: string } }[]; total_amount: number; daily_order_number: number | null; }) => {
              const currentStep = getStepForStatus(order.status);
              const parsedOrderType = order.special_instructions?.match(/\[TYPE:(dine_in|takeaway)\]/)?.[1] || (order.table_id ? 'dine_in' : 'takeaway');
              
              const steps = [
                { id: 1, title: "Order Received", desc: "We've got your order", icon: "receipt_long", time: new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
                { id: 2, title: "Preparing", desc: "Chefs are working their magic", icon: "skillet", time: "" },
                { id: 3, title: "Ready", desc: "Your food is ready to be served!", icon: "room_service", time: "" },
                { id: 4, title: "Completed", desc: "Enjoy your meal", icon: "check_circle", time: order.status === 'served' ? new Date(order.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "" }
              ];

              return (
                <div key={order.id} className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6">
                  <div className="flex justify-between items-center border-b border-surface-variant pb-4 mb-6">
                    <div>
                      <p className="font-label-md text-secondary uppercase tracking-wider text-[10px]">Order No</p>
                      <p className="font-headline-md text-[32px] font-black text-on-surface">#{order.daily_order_number}</p>
                    </div>
                    <div className="bg-surface-container-high px-3 py-1 rounded-md">
                      <span className="font-label-md text-primary flex items-center gap-1">
                        {parsedOrderType === 'takeaway' ? '🛍 Takeaway' : '🍽 Dine In'}
                        {tableId && parsedOrderType === 'dine_in' ? ` - Table ${tableId}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="mb-6 space-y-2">
                    {order.order_items?.map((item: { id: string; quantity: number; price: number; menu_items: { name: string } }) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-on-surface"><span className="font-bold">{item.quantity}x</span> {item.menu_items?.name}</span>
                        <span className="text-secondary">${item.price}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-dashed border-surface-variant flex justify-between font-bold text-on-surface">
                      <span>Total</span>
                      <span>${order.total_amount}</span>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[23px] top-4 bottom-8 w-0.5 bg-surface-variant"></div>
                    
                    {steps.map((step) => {
                      const isCompleted = currentStep > step.id;
                      const isActive = currentStep === step.id;
                      const isPending = currentStep < step.id;

                      return (
                        <div key={step.id} className="relative flex gap-4 mb-8 last:mb-0">
                          <div className="relative z-10 shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-surface-container-lowest shadow-sm transition-colors ${
                              isActive ? 'bg-primary text-on-primary animate-pulse-soft' : 
                              isCompleted ? 'bg-primary text-on-primary' : 
                              'bg-surface-variant text-secondary'
                            }`}>
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isCompleted || isActive ? "'FILL' 1" : "'FILL' 0" }}>
                                {step.icon}
                              </span>
                            </div>
                          </div>
                          
                          <div className={`flex-1 pt-1 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="flex justify-between items-start">
                              <h4 className={`font-label-lg ${isActive ? 'text-primary' : 'text-on-surface'}`}>{step.title}</h4>
                              <span className="font-label-md text-xs text-secondary">{step.time}</span>
                            </div>
                            <p className="font-body-md text-secondary text-sm mt-1">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      <CustomerBottomNav workspaceId={workspaceId} activeTab="orders" />
    </div>
  );
}
