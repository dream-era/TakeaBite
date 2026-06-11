"use client";

import React, { useState, useEffect } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { CreditCard, Search, ArrowDownToLine } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";

export default function CashierPaymentsPage() {
  const { currentSession } = useStaffStore();
  const restaurantId = currentSession?.restaurantId;
  
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeRange, setTimeRange] = useState("today");

  useEffect(() => {
    if (!restaurantId) return;
    const fetchPayments = async () => {
      setLoading(true);
      const supabase = createBrowserSupabase();
      
      let query = supabase
        .from('orders')
        .select('id, daily_order_number, total_amount, payment_method, payment_status, razorpay_payment_id, created_at, tables(table_number)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      const now = new Date();
      if (timeRange === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      } else if (timeRange === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', lastWeek.toISOString());
      } else if (timeRange === 'month') {
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', lastMonth.toISOString());
      }

      const { data } = await query.limit(100);
      if (data) setPayments(data);
      setLoading(false);
    };
    
    fetchPayments();
  }, [restaurantId, timeRange]);

  const filteredPayments = payments.filter(p => {
    if (searchTerm) {
      const matchId = String(p.daily_order_number || p.id).toLowerCase().includes(searchTerm.toLowerCase());
      const matchTxn = String(p.razorpay_payment_id || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchId || matchTxn;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600" />
            Payment Center
          </h1>
          <p className="text-neutral-500 mt-1">Manage and verify transactions</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search order or Txn ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 shadow-sm"
            />
          </div>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">No payments found for this period.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Txn ID</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPayments.map((payment) => {
                    const isPaid = payment.payment_status === 'paid';
                    return (
                      <tr key={payment.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-neutral-900">#{payment.daily_order_number || payment.id.slice(0,6)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-neutral-900">₹{payment.total_amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold capitalize text-neutral-700">{payment.payment_method}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : (payment.payment_status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}`}>
                            {payment.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-neutral-500">
                          {payment.razorpay_payment_id || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{new Date(payment.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={() => window.open(`/cashier-dashboard/bills?order=${payment.id}`, '_self')} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1 justify-end">
                            <ArrowDownToLine className="h-4 w-4" /> Receipt
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
              {filteredPayments.map((payment) => {
                 const isPaid = payment.payment_status === 'paid';
                 return (
                   <div key={payment.id} className="p-4 flex flex-col gap-3">
                     <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-bold text-lg text-neutral-900">#{payment.daily_order_number || payment.id.slice(0,6)}</span>
                          <p className="text-xs text-neutral-500 font-mono mt-0.5 truncate max-w-[150px]">
                            {payment.razorpay_payment_id || 'No Txn ID'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-neutral-900">₹{payment.total_amount}</span>
                          <p className="text-xs text-neutral-500 font-medium mt-0.5">{getRelativeTime(payment.created_at)}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {payment.payment_method} • {payment.payment_status}
                        </span>
                        <button onClick={() => window.open(`/cashier-dashboard/bills?order=${payment.id}`, '_self')} className="text-indigo-600 font-bold text-xs flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg">
                           <ArrowDownToLine className="h-3 w-3" /> Receipt
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
