"use client";

import React, { useState, useEffect } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { History, Search, Printer } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";

export default function CashierHistoryPage() {
  const { currentSession } = useStaffStore();
  const restaurantId = currentSession?.restaurantId;
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!restaurantId) return;
    const fetchHistory = async () => {
      setLoading(true);
      const supabase = createBrowserSupabase();
      
      let query = supabase
        .from('orders')
        .select('*, tables(table_number, table_name)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query.limit(100);
      if (data) setOrders(data);
      setLoading(false);
    };
    
    fetchHistory();
  }, [restaurantId, statusFilter]);

  const filteredOrders = orders.filter(o => {
    if (searchTerm) {
      const matchId = String(o.daily_order_number || o.id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchTable = String(o.tables?.table_number || '').includes(searchTerm);
      return matchId || matchTable;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-indigo-600" />
            Order History
          </h1>
          <p className="text-neutral-500 mt-1">View past orders and bills</p>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="all">All Statuses</option>
            <option value="served">Served</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">No orders found in history.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Type / Table</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map((order) => {
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-neutral-900">#{order.daily_order_number || order.id.slice(0,6)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-700">
                          {order.tables ? `Table ${order.tables.table_number}` : (order.order_type === 'takeaway' ? 'Takeaway' : 'Dine In')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{new Date(order.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-neutral-900">₹{order.total_amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${order.status === 'served' ? 'bg-green-100 text-green-700' : (order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700')}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => window.open(`/cashier-dashboard/bills?order=${order.id}`, '_self')} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 justify-end">
                            <Printer className="h-4 w-4" /> Print Bill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden flex flex-col divide-y divide-neutral-100">
              {filteredOrders.map((order) => {
                 return (
                   <div key={order.id} className="p-4 flex flex-col gap-3">
                     <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-lg text-neutral-900">#{order.daily_order_number || order.id.slice(0,6)}</span>
                          <p className="text-sm font-semibold text-neutral-600 mt-0.5">
                            {order.tables ? `Table ${order.tables.table_number}` : (order.order_type === 'takeaway' ? 'Takeaway' : 'Dine In')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-neutral-900">₹{order.total_amount}</span>
                          <p className="text-xs text-neutral-500 font-medium mt-0.5">{getRelativeTime(order.created_at)}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${order.status === 'served' ? 'bg-green-100 text-green-700' : (order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700')}`}>
                          {order.status}
                        </span>
                        <button onClick={() => window.open(`/cashier-dashboard/bills?order=${order.id}`, '_self')} className="text-indigo-600 font-bold text-xs flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg">
                           <Printer className="h-3 w-3" /> Print Bill
                        </button>
                     </div>
                   </div>
                 )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
