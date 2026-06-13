"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { CheckCircle2, AlertCircle, Truck, Clock, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useKitchenRealtime } from "@/hooks/useRealtime";
import { useStaffStore } from "@/store/useStaffStore";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function ServantDashboardPage() {
  const { currentSession: session } = useStaffStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [deliveredCount, setDeliveredCount] = useState(0);
  
  const restaurantId = session?.restaurantId || "123";
  const station = null; // Servant sees ALL items

  const { orders, isLoading, isConnected, secondsAgo } = useKitchenRealtime(restaurantId, station);

  useEffect(() => {
    setMounted(true);
    // Fetch today's delivered count
    const fetchDelivered = async () => {
      const supabase = createBrowserSupabase();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('status', 'served')
        .gte('created_at', today.toISOString());
      
      if (count !== null) setDeliveredCount(count);
    };
    fetchDelivered();
  }, [restaurantId, orders.length]); // Refresh count when orders list changes

  const handleDeliverOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'order', id: orderId, status: 'served', restaurantId })
      });
      if (!res.ok) throw new Error("Failed to deliver order");
      toast.success("Order Delivered Successfully");
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating order");
    }
  };

  const newOrdersCount = orders.filter(o => {
    const isFoodReady = o.order_items.filter((i: any) => i.station === 'food' || i.station === 'both').every((i: any) => i.status === 'done');
    const isDrinkReady = o.order_items.filter((i: any) => i.station === 'juice' || i.station === 'both').every((i: any) => i.status === 'done');
    return !(isFoodReady && isDrinkReady);
  }).length;

  const readyOrdersCount = orders.length - newOrdersCount;

  return (
    <StaffLayout allowedRoles={['server', 'Server', 'Servant', 'servant', 'cook', 'Cook', 'chef']} themeColor="blue">
      <style>{`
        @keyframes urgentPulse {
          0%, 100% { border-color: #dc2626; }
          50% { border-color: #fca5a5; }
        }
      `}</style>
      <div className="bg-white px-6 py-4 shadow-sm sticky top-0 z-10 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="p-2 -ml-2 text-neutral-500 hover:text-neutral-900 transition-colors active:scale-95">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <Truck className="text-[#2563EB] h-6 w-6" />
              Servant Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-100">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-blue-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-blue-500' : 'bg-red-500'}`}></span>
            </span>
            {isConnected ? 'LIVE' : 'RECONNECTING...'} · {secondsAgo}s ago
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-bold">Live Service Orders</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-[#E8570C] rounded-full text-white">
            <span className="text-xs font-bold">{orders.filter(o => o.status !== 'served').length}</span>
            <span className="text-[10px]">active orders</span>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <div className="bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {newOrdersCount} New Orders ]
          </div>
          <div className="bg-green-50 border border-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {readyOrdersCount} Ready To Deliver ]
          </div>
          <div className="bg-neutral-50 border border-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            [ {deliveredCount} Delivered ]
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="animate-pulse h-10 w-10 bg-neutral-200 rounded-full"></div></div>
        ) : orders.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={Truck}
              title="No orders waiting for delivery"
              description="New orders will appear automatically."
            />
          </div>
        ) : (
          orders.map((order: any) => {
            const parsedOrderType = order.special_instructions?.match(/\[TYPE:(dine_in|takeaway)\]/)?.[1] || (order.tables ? 'dine_in' : 'takeaway');
            const cleanSpecialInstructions = order.special_instructions?.replace(/\[TYPE:(dine_in|takeaway)\]\s*/, '') || null;

            const foodItems = order.order_items.filter((i: any) => i.station === 'food' || i.station === 'both');
            const drinkItems = order.order_items.filter((i: any) => i.station === 'juice' || i.station === 'both');

            const isFoodReady = foodItems.length === 0 || foodItems.every((i: any) => i.status === 'done');
            const isDrinkReady = drinkItems.length === 0 || drinkItems.every((i: any) => i.status === 'done');
            const allReady = isFoodReady && isDrinkReady;
            
            let paymentBadge = null;
            if (order.payment_method === 'online' && order.payment_status === 'paid') {
              paymentBadge = <span className="bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Online Paid</span>;
            } else if (order.payment_method === 'cash' && order.payment_status === 'pending') {
              paymentBadge = <span className="bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Cash Pending</span>;
            } else if (order.payment_method === 'cash' && order.payment_status === 'paid') {
              paymentBadge = <span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Cash Paid</span>;
            } else {
              paymentBadge = <span className="bg-neutral-100 text-neutral-800 border border-neutral-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{order.payment_method} {order.payment_status}</span>;
            }

            let disabledReason = "";
            if (!isFoodReady && !isDrinkReady) disabledReason = "Waiting for Kitchen & Juice Station";
            else if (!isFoodReady) disabledReason = "Waiting for Kitchen";
            else if (!isDrinkReady) disabledReason = "Waiting for Juice Station";

            const orderAgeMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
            const isUrgent = orderAgeMinutes >= 15;

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
                    <div className="font-bold text-neutral-700 text-sm">
                      {parsedOrderType === 'takeaway' 
                        ? '🛍 Takeaway' 
                        : (order.tables 
                            ? `🍽 Table ${order.tables.table_number || order.tables.table_name}`
                            : '🍽 Dine In')}
                    </div>
                    {order.customer_name && (
                      <div className="text-xs font-bold text-neutral-500 mt-0.5">{order.customer_name}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {paymentBadge}
                    <span className="text-xs font-bold text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {getRelativeTime(order.created_at)}
                    </span>
                  </div>
                </div>

                <div className="p-0 border-b border-neutral-100">
                  {order.order_items.map((item: any, index: number) => (
                    <div key={item.id} className={`p-4 ${index !== order.order_items.length - 1 ? 'border-b border-dashed border-neutral-200' : ''}`}>
                      <div className="flex gap-4 items-start">
                        <FoodImage 
                          itemName={item.menu_items?.name || 'Item'} 
                          imageUrl={item.menu_items?.image_url}
                          imageSlug={nameToImageSlug(item.menu_items?.name || '')}
                          size="sm" 
                          className="shrink-0 ring-1 ring-neutral-200 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-neutral-900 text-lg leading-tight mb-1 truncate">{item.menu_items?.name}</p>
                          <p className="text-sm font-black text-neutral-600 mb-2">Qty: {item.quantity}</p>
                          {/* Item specific status not strictly requested in prompt here, but useful to keep context */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 bg-neutral-50 flex justify-between items-center border-b border-neutral-200">
                   <div className="flex gap-2 w-full">
                     <div className={`flex-1 rounded-xl p-2 text-center text-xs font-bold border ${isFoodReady ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                        Food Status: {isFoodReady ? 'Ready' : 'Preparing'}
                     </div>
                     {drinkItems.length > 0 && (
                       <div className={`flex-1 rounded-xl p-2 text-center text-xs font-bold border ${isDrinkReady ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                          Drink Status: {isDrinkReady ? 'Ready' : 'Preparing'}
                       </div>
                     )}
                   </div>
                </div>

                <div className="p-4 space-y-4">
                  {cleanSpecialInstructions && (
                    <div className="bg-orange-50 p-3 rounded-lg flex gap-2 text-sm text-orange-900 border border-orange-100">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wider mb-0.5">Notes</p>
                        <p className="font-medium leading-snug">{cleanSpecialInstructions}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-1 mb-2">
                    <span className="font-bold text-neutral-500 text-sm">Total Amount:</span>
                    <span className="font-black text-neutral-900 text-lg">₹{order.total_amount}</span>
                  </div>

                  <button 
                    onClick={() => handleDeliverOrder(order.id)}
                    disabled={!allReady}
                    className={`w-full py-4 rounded-xl text-sm font-black shadow-sm transition-transform flex items-center justify-center gap-2 ${allReady ? 'bg-[#16a34a] hover:bg-[#15803d] text-white active:scale-[0.98]' : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'}`}
                  >
                    {!allReady ? disabledReason : (
                      <><CheckCircle2 className="h-5 w-5" /> ✓ Mark {order.tables ? `Table ${order.tables.table_number || order.tables.table_name}` : 'Order'} Served</>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </StaffLayout>
  );
}
