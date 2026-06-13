"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { CheckCircle2, AlertCircle, ChefHat, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useKitchenRealtime } from "@/hooks/useRealtime";
import { useStaffStore } from "@/store/useStaffStore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";

export default function CookDashboardPage() {
  const { currentSession: session } = useStaffStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);
  
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('cook_completed_orders');
    if (stored) {
      try { setHiddenOrderIds(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  const restaurantId = session?.restaurantId || "123";
  const station = "food";

  const { orders, isLoading, isConnected, secondsAgo } = useKitchenRealtime(restaurantId, station);

  const handleUpdateItem = async (itemId: string, status: string) => {
    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'item', id: itemId, status, restaurantId })
      });
      if (!res.ok) throw new Error("Failed to update item");
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating item");
    }
  };

  const handleStartPreparing = async (items: any[]) => {
    try {
      await Promise.all(items.filter(i => i.status === 'pending').map(item => 
        fetch('/api/update-order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'item', id: item.id, status: 'preparing', restaurantId })
        })
      ));
    } catch(err) {
      toast.error("Error starting preparation");
    }
  };

  const handleMarkReady = async (items: any[]) => {
    try {
      await Promise.all(items.filter(i => i.status !== 'done').map(item => 
        fetch('/api/update-order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'item', id: item.id, status: 'done', restaurantId })
        })
      ));
    } catch(err) {
      toast.error("Error marking as ready");
    }
  };

  const handleMoveToCompleted = (orderId: string) => {
    const updated = [...hiddenOrderIds, orderId];
    setHiddenOrderIds(updated);
    localStorage.setItem('cook_completed_orders', JSON.stringify(updated));
  };

  const visibleOrders = orders.filter(o => !hiddenOrderIds.includes(o.id));
  
  const newOrdersCount = visibleOrders.filter(o => {
    const items = o.order_items.filter((i: any) => i.station === station || i.station === 'both');
    return items.every((i: any) => i.status === 'pending');
  }).length;

  const prepOrdersCount = visibleOrders.filter(o => {
    const items = o.order_items.filter((i: any) => i.station === station || i.station === 'both');
    return items.some((i: any) => i.status === 'preparing') && !items.every((i: any) => i.status === 'done');
  }).length;

  const readyOrdersCount = visibleOrders.filter(o => {
    const items = o.order_items.filter((i: any) => i.station === station || i.station === 'both');
    return items.every((i: any) => i.status === 'done') && items.length > 0;
  }).length;

  return (
    <StaffLayout allowedRoles={['cook', 'chef']} themeColor="red">
      <style>{`
        @keyframes urgentPulse {
          0%, 100% { border-color: #dc2626; }
          50% { border-color: #fca5a5; }
        }
      `}</style>
      <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <ChefHat className="text-[#D32F2F] h-6 w-6" />
            Cook Dashboard
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-100">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
            {isConnected ? 'LIVE' : 'RECONNECTING...'} · {secondsAgo}s ago
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-bold">Live Kitchen Orders</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#E8570C] rounded-full text-white">
            <span className="text-xs font-bold">{visibleOrders.length}</span>
            <span className="text-[10px]">active orders</span>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {newOrdersCount} New ]
          </div>
          <div className="bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {prepOrdersCount} Preparing ]
          </div>
          <div className="bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {readyOrdersCount} Ready ]
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="animate-pulse h-10 w-10 bg-neutral-200 rounded-full"></div></div>
        ) : visibleOrders.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={ChefHat}
              title="No active food orders"
              description="New orders will appear automatically."
            />
          </div>
        ) : (
          visibleOrders.map((order) => {
            const relevantItems = order.order_items.filter((i: any) => i.station === station || i.station === 'both');
            if (relevantItems.length === 0) return null;

            const isAllNew = relevantItems.every((i: any) => i.status === 'pending');
            const isAllReady = relevantItems.every((i: any) => i.status === 'done');
            
            let statusText = "PREPARING";
            let statusColorClass = "bg-orange-100 text-orange-800 border-orange-200";
            
            if (isAllNew) {
              statusText = "NEW";
              statusColorClass = "bg-rose-100 text-rose-800 border-rose-200";
            } else if (isAllReady) {
              statusText = "READY";
              statusColorClass = "bg-green-100 text-green-800 border-green-200";
            }

            const orderAgeMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
            const isUrgent = orderAgeMinutes >= 15;

            const parsedOrderType = order.special_instructions?.match(/\[TYPE:(dine_in|takeaway)\]/)?.[1] || (order.table_id ? 'dine_in' : 'takeaway');
            const paymentMethodLabel = order.payment_method === 'cash' ? '💵 Cash' : '📱 Online';
            const orderTypeLabel = parsedOrderType === 'takeaway' ? '🛍 Takeaway' : '🍽 Eat Here';

            return (
              <div 
                key={order.id} 
                className="rounded-xl shadow-sm overflow-hidden"
                style={{
                  border: isUrgent ? '2px solid #dc2626' : '1px solid #e5e7eb',
                  background: isUrgent ? '#fff5f5' : '#fff',
                  animation: isUrgent ? 'urgentPulse 2s infinite' : 'none',
                }}
              >
                <div className="px-4 py-3 flex justify-between items-start border-b border-dashed border-neutral-200">
                  <div>
                    <h3 className="font-black text-3xl text-[#111827] tracking-tight leading-none mb-1 font-mono">
                      #{order.daily_order_number}
                    </h3>
                    <div className="font-bold text-neutral-700 text-sm mb-2">
                      {order.tables 
                        ? (order.tables.table_name || `Table ${order.tables.table_number}`)
                        : 'Counter / Takeaway'}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                        {orderTypeLabel}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                        {paymentMethodLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded border ${statusColorClass}`}>
                      {statusText}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">
                      {getRelativeTime(order.created_at)}
                    </span>
                  </div>
                </div>

                <div className="p-0 border-b border-neutral-100 last:border-0">
                  {relevantItems.map((item: any, index: number) => (
                    <div key={item.id} className={`p-4 ${index !== relevantItems.length - 1 ? 'border-b border-dashed border-neutral-200' : ''}`}>
                      <div className="flex gap-4 items-start">
                        <FoodImage 
                          itemName={item.menu_items?.name || 'Food Item'} 
                          imageUrl={item.menu_items?.image_url}
                          imageSlug={nameToImageSlug(item.menu_items?.name || '')}
                          size="sm" 
                          className="shrink-0 ring-1 ring-neutral-200 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-neutral-900 text-lg leading-tight mb-1 truncate">{item.menu_items?.name}</p>
                          <p className="text-sm font-black text-neutral-600">Qty: {item.quantity}</p>
                          
                          {/* If notes are available on item (future-proofing) or if it's the first item and order has notes */}
                          {item.notes && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notes:</p>
                              {item.notes.split('\n').map((note: string, i: number) => (
                                <p key={i} className="text-sm font-medium text-orange-700 flex items-start gap-1">
                                  <span className="shrink-0">📝</span> {note}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* Display order-level notes below the item to match KDS format if no item-level notes exist */}
                          {(!item.notes && order.special_instructions) && (() => {
                            const cleanSpecialInstructions = order.special_instructions?.replace(/\[TYPE:(dine_in|takeaway)\]\s*/, '') || '';
                            if (!cleanSpecialInstructions) return null;
                            return (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Notes:</p>
                                {cleanSpecialInstructions.split('\n').map((note: string, i: number) => (
                                  <p key={i} className="text-sm font-medium text-orange-700 flex items-start gap-1">
                                    <span className="shrink-0">📝</span> {note}
                                  </p>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 bg-neutral-50 border-t border-dashed border-neutral-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-500">
                    Total Items: {relevantItems.length}
                  </span>
                  
                  {isAllNew && (
                    <button 
                      onClick={() => handleStartPreparing(relevantItems)}
                      className="bg-rose-600 active:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform active:scale-95"
                    >
                      Start Preparing
                    </button>
                  )}
                  {!isAllNew && !isAllReady && (
                    <button 
                      onClick={() => handleMarkReady(relevantItems)}
                      className="bg-orange-500 active:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform active:scale-95"
                    >
                      Mark Ready
                    </button>
                  )}
                  {isAllReady && (
                    <button 
                      onClick={() => handleMoveToCompleted(order.id)}
                      className="bg-green-600 active:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-transform active:scale-95"
                    >
                      Move To Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </StaffLayout>
  );
}
