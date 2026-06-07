"use client";
export const dynamic = 'force-dynamic';

import React from "react";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ClipboardList, Banknote, UserCheck, Plus, ExternalLink, Flame } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRestaurantId } from "@/store/authStore";
import { useOwnerRealtime } from "@/hooks/useRealtime";

export default function DashboardPage() {
  const restaurantId = useRestaurantId();

  const { data: analytics } = useQuery({
    queryKey: ['analytics', restaurantId, 'today'],
    queryFn: () => fetch(
      `/api/analytics?restaurantId=${restaurantId}&range=today`
    ).then(r => r.json()),
    enabled: !!restaurantId,
  });

  const { orders, isConnected } = useOwnerRealtime(restaurantId || "");
  const hasData = !!restaurantId; // Assuming if we have a restaurant, we show the dashboard

  return (
    <OwnerLayout>
      <div className="px-8 py-4 pb-24 w-full flex flex-col gap-6">
        
        {/* Header Actions & State Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-neutral-600">Monitor your shop&apos;s performance and live orders.</p>
          </div>
        </div>

        {hasData ? (
          <>
            {/* Active Business Placeholder Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              {/* Stat Card Placeholders */}
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-neutral-700 text-sm">Orders Today</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900 tracking-tight">{analytics?.totalOrders || 0}</div>
                <p className="mt-2 text-xs text-neutral-400">Total orders today</p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-neutral-700 text-sm">Revenue</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900 tracking-tight">₹{analytics?.totalRevenue?.toFixed(2) || "0.00"}</div>
                <p className="mt-2 text-xs text-neutral-400">Total revenue today</p>
              </div>

              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 text-neutral-500">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-neutral-700 text-sm">Avg Order Value</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900 tracking-tight">₹{analytics?.avgOrderValue?.toFixed(2) || "0.00"}</div>
                <p className="mt-2 text-xs text-neutral-400">Average value per order</p>
              </div>
            </div>

            {/* Kanban Placeholder */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-neutral-900">Live Workflow Board</h2>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 rounded-full text-xs font-medium">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
                    {isConnected ? "Live" : "Reconnecting..."}
                  </div>
                </div>
                <Link href="/qr-generation" className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1">
                  Preview Customer Menu <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
              
              {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <ClipboardList className="h-10 w-10 text-neutral-300 mb-4" />
                  <h3 className="text-neutral-700 font-semibold mb-1">No Active Orders</h3>
                  <p className="text-neutral-500 text-sm max-w-sm">
                    When customers place orders from your digital menu or QR code, they will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-bold px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md">
                            Table {order.tables?.table_number || "N/A"}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'ready' ? 'bg-green-100 text-green-700' :
                          'bg-neutral-100 text-neutral-700'
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-neutral-700">{item.quantity}x {item.menu_items?.name}</span>
                            <span className="text-neutral-500 font-medium">₹{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                        <span className="text-xs text-neutral-500">Total</span>
                        <span className="font-bold text-neutral-900">₹{order.total_amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty / New Business Dashboard */
          <div className="flex flex-col items-center justify-center py-12">
            <EmptyState 
              icon={Flame}
              title="Welcome to your new Workspace"
              description="Your dashboard is currently empty. To start receiving orders and tracking revenue, you need to set up your shop details first."
              actionButton={
                <Link href="/onboarding" className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700">
                  <Plus className="h-4 w-4" /> Setup Shop
                </Link>
              }
              className="w-full max-w-2xl py-16 bg-white"
            />
          </div>
        )}

      </div>
    </OwnerLayout>
  );
}
