"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useOrderStore, OrderStatus } from "@/store/useOrderStore";
import { useStaffStore } from "@/store/useStaffStore";
import { Bell, Filter, ChevronDown, CheckCircle2, ArrowRight, Clock } from "lucide-react";

export default function JuiceMakerDashboardPage() {
  const { orders, updateOrderStatus } = useOrderStore();
  const { currentSession } = useStaffStore();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const relevantOrders = orders
    .filter(order => order.workspaceId === (currentSession?.restaurantId || currentSession?.workspaceId))
    .filter(order => order.items.some(i => i.itemType === 'beverage'))
    .filter(order => order.statusByBeverage !== 'COMPLETED')
    .sort((a, b) => b.createdAt - a.createdAt);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'NEW': return 'bg-rose-50 text-rose-600';
      case 'PREPARING': return 'bg-orange-50 text-orange-500';
      case 'READY': return 'bg-emerald-50 text-emerald-600';
      default: return 'bg-neutral-100 text-neutral-500';
    }
  };

  const getStatusDot = (status: OrderStatus) => {
    switch (status) {
      case 'NEW': return 'bg-rose-500';
      case 'PREPARING': return 'bg-orange-500';
      case 'READY': return 'bg-emerald-500';
      default: return 'bg-neutral-400';
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    return `${minutes} min ago`;
  };

  return (
    <StaffLayout allowedRoles={['juice']} themeColor="green">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white px-4 py-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <button className="p-2 -ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-[#1B5E20]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V9a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v11a2 2 0 0 0 2 2z"/><path d="M10 5v4"/><path d="M14 5v4"/><path d="M10 2v3"/><path d="M14 2v3"/><path d="M8 9h8"/></svg>
            </div>
            <div className="flex flex-col items-center">
              <h1 className="font-bold text-[17px] leading-tight tracking-wide">Juice Maker Dashboard</h1>
              <p className="text-[#999999] text-[11px]">Manage & prepare juice orders</p>
            </div>
          </div>

          <div className="relative p-2 -mr-2">
            <Bell className="w-6 h-6" />
            <div className="absolute top-1 right-1 w-4 h-4 bg-[#D32F2F] rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-[#1a1a1a]">
              {relevantOrders.filter(o => o.statusByBeverage === 'NEW').length}
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="flex justify-between items-center px-4 py-4 bg-neutral-50 sticky top-[72px] z-30">
        <h2 className="font-bold text-xl text-neutral-900 tracking-tight">Orders</h2>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-sm font-medium text-neutral-700">
            Newest First <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1 text-sm font-medium text-neutral-700">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 pb-6 space-y-4">
        {relevantOrders.length === 0 ? (
          <div className="text-center py-10 text-neutral-500">
            No active beverage orders right now.
          </div>
        ) : (
          relevantOrders.map(order => {
            const beverageItems = order.items.filter(i => i.itemType === 'beverage');
            const totalAmount = beverageItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return (
              <div key={order.id} className="bg-white rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden relative">
                {/* Accent line for NEW orders */}
                {order.statusByBeverage === 'NEW' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D32F2F]" />
                )}
                {order.statusByBeverage === 'PREPARING' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400" />
                )}
                {order.statusByBeverage === 'READY' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Order</span>
                      <h3 className="text-2xl font-black text-neutral-900 tracking-tight leading-none">#{order.id.replace('order-', '')}</h3>
                      <div className="flex items-center gap-1 mt-2 text-[#D32F2F] font-bold text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M15 21V9"/></svg>
                        Table {order.tableId}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 border border-transparent ${getStatusColor(order.statusByBeverage)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(order.statusByBeverage)}`} />
                        {order.statusByBeverage}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {getTimeAgo(order.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    {beverageItems.map(item => (
                      <div key={item.id} className="flex gap-3">
                        {item.imageUrl ? (
                          <div className="w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0 shadow-sm border border-neutral-100">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-[52px] h-[52px] rounded-xl bg-neutral-100 shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-neutral-900 text-sm">{item.quantity} x {item.name}</h4>
                            <span className="font-bold text-neutral-900 text-sm">₹{item.price * item.quantity}</span>
                          </div>
                          {item.notes && (
                            <p className="text-[13px] text-neutral-500 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center py-4 border-t border-dashed border-neutral-200">
                    <span className="text-[13px] text-neutral-500 font-medium">Total Amount</span>
                    <span className="text-xl font-black text-[#D32F2F]">₹{totalAmount}</span>
                  </div>

                  <div className="mt-2">
                    {order.statusByBeverage === 'NEW' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'beverage', 'PREPARING')}
                        className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-md shadow-red-500/20"
                      >
                        Start Preparing <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                    {order.statusByBeverage === 'PREPARING' && (
                      <button 
                        onClick={() => updateOrderStatus(order.id, 'beverage', 'READY')}
                        className="w-full bg-white border-[1.5px] border-orange-400 text-orange-500 font-bold py-3.5 rounded-[14px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                      >
                        Mark as Ready <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    {/* Mark as Completed button removed */}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </StaffLayout>
  );
}
