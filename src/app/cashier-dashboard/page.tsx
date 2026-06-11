"use client";

import React, { useState, useEffect } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { 
  ShoppingBag, CreditCard, Clock, CheckCircle2, TrendingUp, IndianRupee 
} from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import { RealtimeChannel } from "@supabase/supabase-js";

export default function CashierDashboard() {
  const { currentSession } = useStaffStore();
  const restaurantId = currentSession?.restaurantId;

  const [stats, setStats] = useState({
    ordersToday: 0,
    paidOrders: 0,
    pendingPayments: 0,
    cashPayments: 0,
    onlinePayments: 0,
    revenue: 0,
    avgValue: 0
  });
  
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    const supabase = createBrowserSupabase();
    let channel: RealtimeChannel;

    const fetchDashboardData = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      // Fetch stats
      const { data: metricsData } = await supabase
        .from('daily_order_summary')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('order_date', today.toISOString().split('T')[0])
        .single();
      
      // Fetch pending orders (not paid)
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('payment_status', 'pending')
        .neq('status', 'cancelled')
        .gte('created_at', todayIso);

      if (metricsData) {
        setStats({
          ordersToday: metricsData.total_orders || 0,
          paidOrders: (metricsData.total_orders || 0) - (pendingCount || 0),
          pendingPayments: pendingCount || 0,
          cashPayments: metricsData.cash_orders || 0,
          onlinePayments: metricsData.online_orders || 0,
          revenue: metricsData.total_revenue || 0,
          avgValue: metricsData.avg_order_value || 0
        });
      }

      // Fetch recent orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, tables(table_number, table_name)')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', todayIso)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersData) setRecentOrders(ordersData);
      setLoading(false);
    };

    fetchDashboardData();

    // Subscribe to realtime changes
    channel = supabase.channel(`cashier_dash_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-6"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;
  }

  const statCards = [
    { label: "Today's Revenue", value: `₹${stats.revenue.toFixed(2)}`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-100" },
    { label: "Orders Today", value: stats.ordersToday, icon: ShoppingBag, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Pending Payments", value: stats.pendingPayments, icon: Clock, color: "text-orange-600", bg: "bg-orange-100" },
    { label: "Online Payments", value: stats.onlinePayments, icon: CreditCard, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Cash Payments", value: stats.cashPayments, icon: CreditCard, color: "text-teal-600", bg: "bg-teal-100" },
    { label: "Avg Order Value", value: `₹${Number(stats.avgValue).toFixed(2)}`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-neutral-500 mt-1">Real-time statistics for today's service</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-neutral-100 flex flex-col gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl lg:text-3xl font-black text-neutral-900 mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">Recent Orders</h2>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Table / Type</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentOrders.map((order) => {
                const isPaid = order.payment_status === 'paid';
                return (
                  <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-neutral-900">#{order.daily_order_number || order.id.slice(0,6)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-700">
                      {order.tables ? `Table ${order.tables.table_number}` : (order.order_type === 'takeaway' ? 'Takeaway' : 'Dine In')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{getRelativeTime(order.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-neutral-900">₹{order.total_amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {order.payment_method} • {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden flex flex-col divide-y divide-neutral-100">
          {recentOrders.map((order) => {
             const isPaid = order.payment_status === 'paid';
             return (
               <div key={order.id} className="p-4 flex flex-col gap-3">
                 <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-lg text-neutral-900">#{order.daily_order_number || order.id.slice(0,6)}</span>
                      <p className="text-sm font-semibold text-neutral-600 mt-0.5">
                        {order.tables ? `Table ${order.tables.table_number}` : (order.order_type === 'takeaway' ? 'Takeaway' : 'Dine In')}
                      </p>
                    </div>
                    <span className="text-lg font-black text-neutral-900">₹{order.total_amount}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {order.payment_method} • {order.payment_status}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">{getRelativeTime(order.created_at)}</span>
                 </div>
               </div>
             )
          })}
        </div>
        {recentOrders.length === 0 && (
          <div className="p-8 text-center text-neutral-500">No orders today yet.</div>
        )}
      </div>
    </div>
  );
}
