"use client";

import React, { useState, useEffect } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { useKitchenRealtime } from "@/hooks/useRealtime";
import { 
  ShoppingBag, CheckCircle2, Clock, Truck, Printer, IndianRupee, Search
} from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import { toast } from "react-hot-toast";

export default function CashierOrdersPage() {
  const { currentSession } = useStaffStore();
  const restaurantId = currentSession?.restaurantId || "";
  
  // Use existing realtime hook for active orders
  const { orders, isLoading, isConnected } = useKitchenRealtime(restaurantId, null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const handleMarkPaid = async (orderId: string) => {
    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kitchen-session': currentSession?.fingerprint || '', 'x-staff-id': currentSession?.staffId || '' },
        body: JSON.stringify({ type: 'payment', id: orderId, status: 'paid', restaurantId })
      });
      if (!res.ok) throw new Error("Failed to update payment status");
      toast.success("Payment marked as received");
    } catch(err: any) {
      toast.error(err.message || "Error updating payment");
    }
  };

  const filteredOrders = orders.filter(o => {
    if (searchTerm) {
      const matchId = String(o.daily_order_number || o.id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchTable = String(o.tables?.table_number || '').includes(searchTerm);
      if (!matchId && !matchTable) return false;
    }
    if (filter === 'pending_payment') {
      return o.payment_status === 'pending';
    }
    if (filter === 'ready_takeaway') {
      const parsedOrderType = o.order_type || o.special_instructions?.match(/\[TYPE:(eat_here|takeaway)\]/)?.[1] || (o.table_id ? 'eat_here' : 'takeaway');
      return parsedOrderType === 'takeaway' && o.status === 'ready';
    }
    return true;
  });

  if (isLoading) {
    return <div className="flex h-full items-center justify-center p-6"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
            Active Orders
          </h1>
          <p className="text-neutral-500 mt-1 flex items-center gap-2">
            <span className={`inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Live Updates Active' : 'Connecting...'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search order or table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 shadow-sm"
            />
          </div>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="all">All Active Orders</option>
            <option value="pending_payment">Pending Payments Only</option>
            <option value="ready_takeaway">Ready Takeaways</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900">No active orders found</h3>
          <p className="text-neutral-500 mt-1">Orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const isPaid = order.payment_status === 'paid';
            const isPendingCash = order.payment_method === 'cash' && !isPaid;

            return (
              <div key={order.id} className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-neutral-100 flex justify-between items-start bg-neutral-50/50">
                  <div>
                    <h3 className="font-mono font-black text-xl text-neutral-900 leading-none">
                      #{order.daily_order_number}
                    </h3>
                    <p className="text-sm font-bold text-indigo-700 mt-1">
                      {order.tables ? `Table ${order.tables.table_number}` : (order.order_type === 'takeaway' ? 'Takeaway' : 'Eat Here')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-lg font-black text-neutral-900">₹{order.total_amount}</span>
                    <span className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {getRelativeTime(order.created_at)}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-semibold">Payment</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {order.payment_method} • {order.payment_status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500 font-semibold">Status</span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700">
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-neutral-100 flex gap-2">
                    {isPendingCash ? (
                      <button 
                        onClick={() => handleMarkPaid(order.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <IndianRupee className="h-4 w-4" /> Receive Cash
                      </button>
                    ) : (
                      <div className="flex-1 bg-neutral-100 text-neutral-500 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                        <CheckCircle2 className="h-4 w-4" /> Paid
                      </div>
                    )}
                    {(order.order_type === 'takeaway' || (!order.table_id && order.order_type !== 'eat_here')) && order.status === 'ready' ? (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/update-order-status', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'x-kitchen-session': currentSession?.fingerprint || '', 'x-staff-id': currentSession?.staffId || '' },
                              body: JSON.stringify({ type: 'order', id: order.id, status: 'served', restaurantId })
                            });
                            if (!res.ok) throw new Error("Failed to update status");
                            toast.success("Order handed to customer");
                          } catch(err: any) {
                            toast.error(err.message || "Error updating order");
                          }
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingBag className="h-4 w-4" /> Hand To Customer
                      </button>
                    ) : (
                      <button 
                        onClick={() => window.open(`/cashier-dashboard/bills?order=${order.id}`, '_self')}
                        className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
