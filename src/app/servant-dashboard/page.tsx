"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { useStaffStore } from '@/store/useStaffStore';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { CheckCircle, Clock, ChefHat, ReceiptText, MapPin, X } from 'lucide-react';
import { Logo } from "@/components/shared/Logo";
import { updateOrderStatus } from '@/actions/orders';
import { toast } from 'react-hot-toast';

export default function ServantDashboard() {
  const { currentSession } = useStaffStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!currentSession) return;
    const supabase = createBrowserSupabase();
    
    // Get start and end of day in Asia/Kolkata
    const today = new Date();
    const dateString = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const startOfDay = `${dateString}T00:00:00+05:30`;
    const endOfDay = `${dateString}T23:59:59+05:30`;

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        tables (
          table_number,
          table_name
        ),
        order_items (
          *,
          menu_items (
            name
          )
        )
      `)
      .eq('restaurant_id', currentSession.restaurantId || currentSession.workspaceId)
      .neq('status', 'cancelled')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const filteredData = data.filter(order => {
        const parsedOrderType = order.order_type || order.special_instructions?.match(/\[TYPE:(eat_here|takeaway|dine_in)\]/)?.[1] || (order.table_id ? 'eat_here' : 'takeaway');
        return parsedOrderType !== 'takeaway';
      });
      setOrders(filteredData);
    }
    setLoading(false);
  }, [currentSession]);

  useEffect(() => {
    fetchOrders();

    if (!currentSession) return;
    const supabase = createBrowserSupabase();
    
    const channel = supabase.channel('servant_orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${currentSession.restaurantId || currentSession.workspaceId}`
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, currentSession]);

  const newOrders = orders.filter(o => o.status === 'confirmed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const servedOrders = orders.filter(o => o.status === 'served');

  const markAsServed = async (orderId: string) => {
    try {
      const res = await updateOrderStatus(orderId, 'served');
      if (res.success) {
        toast.success("Order marked as served!");
        setSelectedOrder(null);
      } else {
        toast.error("Failed to update order");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse';
      case 'served': return 'bg-neutral-100 text-neutral-800 border-neutral-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'confirmed': return 'New Order';
      case 'preparing': return 'Preparing';
      case 'ready': return 'Ready for Delivery';
      case 'served': return 'Served';
      default: return status;
    }
  };

  return (
    <StaffLayout allowedRoles={['servant', 'cook', 'chef', 'juice', 'server']} themeColor="emerald">
      <div className="min-h-screen bg-neutral-50 pb-24">
        {/* Header */}
        <header className="bg-[#1a1a1a] text-white px-4 py-4 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <Logo size="sm" variant="icon" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-bold text-[17px] leading-tight tracking-wide flex items-center gap-2">
                  Servant Dashboard
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </h1>
                <p className="text-[#999999] text-[11px]">Monitor and manage deliveries</p>
              </div>
            </div>
          </div>
        </header>

        {/* Statistics */}
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
            <span className="text-xs font-medium text-neutral-500">Total Today</span>
            <span className="text-xl font-bold text-neutral-900 mt-1">{orders.length}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-sm flex flex-col">
            <span className="text-xs font-medium text-emerald-600">Ready</span>
            <span className="text-xl font-bold text-emerald-700 mt-1">{readyOrders.length}</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm flex flex-col">
            <span className="text-xs font-medium text-blue-600">Served</span>
            <span className="text-xl font-bold text-blue-700 mt-1">{servedOrders.length}</span>
          </div>
        </div>

        {/* Lists */}
        <div className="p-4 space-y-6">
          {/* Ready Orders section */}
          {readyOrders.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Action Required (Ready)
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {readyOrders.map(order => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
            </section>
          )}

          {/* New / Preparing */}
          {(newOrders.length > 0 || preparingOrders.length > 0) && (
            <section>
              <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <ChefHat className="w-4 h-4 text-amber-500" /> In Kitchen
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[...newOrders, ...preparingOrders].map(order => (
                  <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
                ))}
              </div>
            </section>
          )}



          {loading && orders.length === 0 && (
            <div className="text-center py-10 text-neutral-500 text-sm">Loading orders...</div>
          )}
          
          {!loading && orders.length === 0 && (
            <div className="text-center py-10 bg-white rounded-xl border border-neutral-200">
              <ReceiptText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-neutral-500 text-sm">No orders today</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
              
              {/* Header */}
              <div className="p-5 border-b border-neutral-100 flex justify-between items-start bg-neutral-50 relative">
                <button onClick={() => setSelectedOrder(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full border border-neutral-200 shadow-sm text-neutral-500 hover:text-neutral-900 active:scale-95 transition-transform">
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-1">
                  <h3 className="font-black text-neutral-900 text-2xl tracking-tight">Order #{selectedOrder.daily_order_number}</h3>
                  <div className="flex items-center gap-3 text-sm font-semibold text-neutral-600">
                    <span className="flex items-center gap-1 bg-neutral-200/50 px-2 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5" /> 
                      {selectedOrder.tables ? (selectedOrder.tables.table_name || `Table ${selectedOrder.tables.table_number}`) : "Takeaway"}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(selectedOrder.created_at))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="font-bold text-neutral-900 text-sm">{item.quantity}x</span>
                          <div>
                            <p className="font-semibold text-neutral-800 text-sm">{item.menu_items?.name}</p>
                            {item.station && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                {item.station}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-medium text-neutral-600 text-sm">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full border-t border-dashed border-neutral-200 mb-6"></div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                    <span className="font-bold text-neutral-600 text-sm uppercase tracking-wider">Total Amount</span>
                    <span className="font-black text-neutral-900 text-xl">₹{selectedOrder.total_amount}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-neutral-100 rounded-lg">
                    <span className="text-sm font-bold text-neutral-500">Payment</span>
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {selectedOrder.payment_method} - {selectedOrder.payment_status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 border border-neutral-100 rounded-lg">
                    <span className="text-sm font-bold text-neutral-500">Order Type</span>
                    <span className="text-sm font-bold text-neutral-900">
                      {selectedOrder.order_type === 'takeaway' ? 'Takeaway' : 'Eat Here'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Actions</h4>
                {selectedOrder.status === 'ready' ? (
                  <button 
                    onClick={() => markAsServed(selectedOrder.id)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    MARK AS DELIVERED
                  </button>
                ) : (
                  <div className="w-full py-4 bg-neutral-100 text-neutral-500 font-bold rounded-xl text-center text-sm border border-neutral-200">
                    Status: {getStatusText(selectedOrder.status)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );

  function OrderCard({ order, onClick }: { order: any, onClick: () => void }) {
    return (
      <div onClick={onClick} className={`bg-white p-4 rounded-xl border shadow-sm cursor-pointer transition-all hover:shadow-md ${getStatusColor(order.status)}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg">#{order.daily_order_number}</span>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }).format(new Date(order.created_at))}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-700 mt-3 bg-white/50 p-2 rounded-lg inline-flex">
          <MapPin className="w-4 h-4 text-brand-500" />
          {order.tables ? (order.tables.table_name || `Table ${order.tables.table_number}`) : "Takeaway"}
        </div>
      </div>
    );
  }
}
