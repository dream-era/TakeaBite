"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useOrderStore } from "@/store/useOrderStore";
import { useStaffStore } from "@/store/useStaffStore";
import { Filter, ChevronDown, CheckCircle, ChefHat } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";
import FoodImage from "@/components/shared/FoodImage";
import { nameToImageSlug } from "@/data/foodLibrary";

export default function CompletedOrdersPage() {
  const { orders } = useOrderStore();
  const { currentSession } = useStaffStore();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (!currentSession) return null;

  const itemType = currentSession.role === 'Cook' || currentSession.role === 'chef' || currentSession.role === 'cook' ? 'food' : 'beverage';
  const themeColor = currentSession.role === 'Cook' || currentSession.role === 'chef' || currentSession.role === 'cook' ? 'red' : 'green';
  const headerTitle = currentSession.role === 'Cook' || currentSession.role === 'chef' || currentSession.role === 'cook' ? 'Cook Dashboard' : 'Juice Maker Dashboard';

  const relevantOrders = orders
    .filter(order => order.workspaceId === currentSession.workspaceId)
    .filter(order => order.items.some(i => i.itemType === itemType))
    .filter(order => itemType === 'food' ? order.statusByFood === 'COMPLETED' : order.statusByBeverage === 'COMPLETED')
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <StaffLayout allowedRoles={['cook', 'chef', 'Cook', 'Juice Maker', 'juice', 'juice_maker']} themeColor={themeColor as any}>
      {/* Header */}
      <div className="bg-[#1a1a1a] text-white px-6 py-4 shadow-sm sticky top-0 z-10 space-y-3">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className={themeColor === 'red' ? 'text-[#D32F2F]' : 'text-[#1B5E20]'} />
            Completed Orders
          </h1>
        </div>
        <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-bold">{headerTitle} History</p>
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
        {relevantOrders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <ChefHat className="w-16 h-16 text-neutral-200 mb-4" />
            <h3 className="text-lg font-bold text-neutral-900">No completed orders yet</h3>
            <p className="text-neutral-500">Orders marked as completed will appear here.</p>
          </div>
        ) : (
          relevantOrders.map(order => {
            const displayItems = order.items.filter(i => i.itemType === itemType);

            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden opacity-75">
                <div className="px-4 py-3 flex justify-between items-start border-b border-dashed border-neutral-200 bg-neutral-50">
                  <div>
                    <h3 className="font-black text-lg text-neutral-500 tracking-tight leading-none mb-1 line-through decoration-neutral-300">
                      #{order.id.replace('order-', '').slice(0, 6)}
                    </h3>
                    <div className="font-bold text-neutral-400 text-sm">
                      Table {order.tableId}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded border bg-neutral-100 text-neutral-500 border-neutral-200">
                      COMPLETED
                    </span>
                    <span className="text-xs font-bold text-neutral-400">
                      {getRelativeTime(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="p-0 space-y-0">
                  {displayItems.map((item, index) => (
                    <div key={item.id} className={`p-4 flex gap-4 items-center opacity-70 ${index !== displayItems.length - 1 ? 'border-b border-dashed border-neutral-200' : ''}`}>
                      <FoodImage 
                        itemName={item.name} 
                        imageUrl={item.imageUrl}
                        imageSlug={nameToImageSlug(item.name)}
                        size="sm" 
                        className="shrink-0 ring-1 ring-neutral-200 shadow-sm opacity-80"
                        style={{ width: 48, height: 48 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-500 text-base leading-tight truncate">{item.name}</p>
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
