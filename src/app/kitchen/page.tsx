"use client";

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, AlertCircle, Utensils } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useKitchenRealtime } from "@/hooks/useRealtime";
import { toast } from "react-hot-toast";

export default function KitchenViewPage() {
  const [session, setSession] = useState<{ restaurantId: string; role: string; name: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem('menuqr_kitchen_session');
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch {}
    } else {
      // Mock session for demo if not logged in
      setSession({
        restaurantId: "123", // Replace with real later
        role: "chef",
        name: "Demo Chef"
      });
    }
  }, []);

  const restaurantId = session?.restaurantId || "123";
  const station = session?.role === "juice" ? "juice" : session?.role === "server" ? null : "food";

  const { orders, isLoading, isConnected } = useKitchenRealtime(restaurantId, station);

  const [hasOrders, setHasOrders] = useState(false);
  useEffect(() => {
    setHasOrders(orders.length > 0);
  }, [orders]);

  const handleUpdateItem = async (itemId: string, status: string) => {
    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kitchen-session': currentSession?.fingerprint || '', 'x-staff-id': currentSession?.staffId || '' },
        body: JSON.stringify({ type: 'item', id: itemId, status, restaurantId })
      });
      if (!res.ok) throw new Error("Failed to update item");
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating item");
    }
  };

  const handleUpdateOrder = async (orderId: string, status: string) => {
    try {
      const res = await fetch('/api/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kitchen-session': currentSession?.fingerprint || '', 'x-staff-id': currentSession?.staffId || '' },
        body: JSON.stringify({ type: 'order', id: orderId, status, restaurantId })
      });
      if (!res.ok) throw new Error("Failed to update order");
    } catch(err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating order");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      {/* Dark Theme Header for Kitchen Display System */}
      <header className="bg-black/50 border-b border-neutral-800 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-neutral-800 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-700 shadow-[0_0_15px_rgba(229,9,20,0.5)]">
            <Logo size="lg" variant="icon" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight">Kitchen Display</h1>
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} title={isConnected ? 'Connected Live' : 'Disconnected'} />
            </div>
            <p className="text-xs text-brand-400 font-bold uppercase tracking-widest">
              Live Orders • {session?.role || 'Unknown Station'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
            <Clock className="h-4 w-4 text-neutral-400" />
            <span className="font-mono font-bold text-sm text-neutral-300">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button 
            onClick={() => setHasOrders(!hasOrders)}
            className="text-xs bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Toggle Demo
          </button>
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-white transition-colors">Exit</Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-6 snap-x pb-6">
        {isLoading ? (
          <div className="w-full flex items-center justify-center h-full">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-neutral-800"></div>
              <div className="text-neutral-500">Loading live orders...</div>
            </div>
          </div>
        ) : !hasOrders ? (
          <div className="w-full flex items-center justify-center h-full">
            <EmptyState 
              icon={Utensils}
              title="No Pending Orders"
              description="The kitchen is clear. New orders will appear here automatically when customers place them."
              className="border-neutral-800 bg-neutral-800/50 max-w-lg"
            />
          </div>
        ) : (
          <>
            {orders.map((order: { id: string; status: string; created_at: string; tables: { table_name: string; table_number: string }; order_items: { id: string; status: string; station: string; quantity: number; menu_items: { name: string } }[] }) => {
              // Only show items for this station if station is set
              const relevantItems = station 
                ? order.order_items.filter((i: { station: string }) => i.station === station || i.station === 'both')
                : order.order_items;

              const isOrderReady = relevantItems.every((i: { status: string }) => i.status === 'done');

              return (
                <div key={order.id} className="flex-shrink-0 w-80 max-w-[85vw] h-full flex flex-col bg-neutral-800 rounded-2xl border border-neutral-700 shadow-xl overflow-hidden snap-center">
                  <div className={`${isOrderReady ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} border-b px-5 py-3`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-lg font-bold text-white">#{order.daily_order_number}</span>
                      <span className={`${isOrderReady ? 'text-emerald-400' : 'text-rose-400'} text-xs font-bold flex items-center gap-1 animate-pulse`}>
                        <Clock className="h-3 w-3" /> {Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)}m waiting
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-neutral-300 font-medium">
                        {order.tables 
                          ? (order.tables.table_name || `Table ${order.tables.table_number}`)
                          : 'Takeaway'}
                      </span>
                      <span className={`${isOrderReady ? 'bg-emerald-500' : 'bg-rose-500'} text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm tracking-wider`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                    {relevantItems.map((item: { id: string; status: string; quantity: number; menu_items: { name: string } }) => (
                      <div key={item.id} className="flex items-start justify-between border-b border-neutral-700 pb-4">
                        <div className="flex gap-3">
                          <span className="font-bold text-xl text-neutral-400">{item.quantity}x</span>
                          <div>
                            <h4 className="text-lg font-bold text-white leading-tight mb-1">{item.menu_items?.name}</h4>
                            {item.status === 'pending' && (
                              <button onClick={() => handleUpdateItem(item.id, 'preparing')} className="text-xs bg-brand-600/20 text-brand-400 px-2 py-1 rounded mt-1">Start Preparing</button>
                            )}
                            {item.status === 'preparing' && (
                              <button onClick={() => handleUpdateItem(item.id, 'done')} className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded mt-1">Mark Done</button>
                            )}
                            {item.status === 'done' && (
                              <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3"/> Done</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.special_instructions && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-4">
                        <div className="flex gap-1 text-xs text-amber-400 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" /> {order.special_instructions}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 border-t border-neutral-700 bg-neutral-800/80">
                    <button 
                      onClick={() => handleUpdateOrder(order.id, 'ready')}
                      disabled={!isOrderReady || order.status === 'ready'}
                      className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 md:py-4 rounded-xl transition-colors shadow-[0_0_15px_rgba(229,9,20,0.3)] text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="h-5 w-5" /> Mark Order Ready
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>
    </div>
  );
}
