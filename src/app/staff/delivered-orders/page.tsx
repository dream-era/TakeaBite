"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffStore } from "@/store/useStaffStore";
import { Filter, ChevronDown, CheckCircle, Truck, Clock } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function DeliveredOrdersPage() {
  const { currentSession } = useStaffStore();
  
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!currentSession) return;

    const fetchDeliveredOrders = async () => {
      const supabase = createBrowserSupabase();
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables ( id, table_number, table_name ),
          order_items (
            *,
            menu_items ( id, name, category, station, is_veg, image_url )
          )
        `)
        .eq('restaurant_id', currentSession.restaurantId)
        .eq('status', 'served')
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 delivered orders

      if (data) {
        setOrders(data);
      }
      setIsLoading(false);
    };

    fetchDeliveredOrders();
  }, [currentSession]);

  if (!mounted) return null;
  if (!currentSession) return null;

  return (
    <StaffLayout allowedRoles={['server', 'Server', 'Manager', 'manager']} themeColor="blue">
      {/* Header */}
      <div className="bg-[#1a1a1a] text-white px-6 py-4 shadow-sm sticky top-0 z-10 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="text-[#1976D2]" />
            Delivered Orders
          </h1>
        </div>
        <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-bold">Servant Dashboard History</p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center px-4 py-4 bg-neutral-50 border-b border-neutral-200">
        <h2 className="font-bold text-xl text-neutral-900 tracking-tight">History</h2>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-sm font-bold text-neutral-700 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-sm">
            Today <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1 text-sm font-bold text-neutral-700 bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="animate-pulse h-10 w-10 bg-neutral-200 rounded-full"></div></div>
        ) : orders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Truck className="w-16 h-16 text-neutral-200 mb-4" />
            <h3 className="text-lg font-bold text-neutral-900">No delivered orders yet</h3>
            <p className="text-neutral-500">Orders marked as served will appear here.</p>
          </div>
        ) : (
          orders.map((order: any) => {
            const parsedOrderType = order.special_instructions?.match(/\[TYPE:(dine_in|takeaway)\]/)?.[1] || (order.tables ? 'dine_in' : 'takeaway');
            
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

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden opacity-80">
                <div className="px-4 py-3 flex justify-between items-start border-b border-dashed border-neutral-200 bg-neutral-50">
                  <div>
                    <h3 className="font-black text-lg text-neutral-500 tracking-tight leading-none mb-1 line-through decoration-neutral-300">
                      Order #{order.id.slice(0, 6)}
                    </h3>
                    <div className="font-bold text-neutral-500 text-sm">
                      {parsedOrderType === 'takeaway' 
                        ? '🛍 Takeaway' 
                        : (order.tables 
                            ? `🍽 Table ${order.tables.table_number || order.tables.table_name}`
                            : '🍽 Dine In')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {paymentBadge}
                    <span className="text-xs font-bold text-neutral-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {getRelativeTime(order.created_at)}
                    </span>
                  </div>
                </div>

                <div className="p-0 space-y-0">
                  {order.order_items.map((item: any, index: number) => (
                    <div key={item.id} className={`p-4 flex gap-4 items-center opacity-80 ${index !== order.order_items.length - 1 ? 'border-b border-dashed border-neutral-200' : ''}`}>
                      <FoodImage 
                        itemName={item.menu_items?.name || 'Item'} 
                        imageUrl={item.menu_items?.image_url}
                        imageSlug={nameToImageSlug(item.menu_items?.name || '')}
                        size="sm" 
                        className="shrink-0 ring-1 ring-neutral-200 shadow-sm opacity-80"
                        style={{ width: 48, height: 48 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-500 text-base leading-tight truncate">{item.menu_items?.name}</p>
                        <p className="font-bold text-sm text-neutral-400 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </StaffLayout>
  );
}
