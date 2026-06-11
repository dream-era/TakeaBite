"use client";

import React, { useState, useEffect } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Receipt, Search, Printer, ArrowLeft } from "lucide-react";

export default function CashierBillsPage() {
  const { currentSession } = useStaffStore();
  const restaurantId = currentSession?.restaurantId;
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('order');

  const [searchTerm, setSearchTerm] = useState(initialOrderId || "");
  const [order, setOrder] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    const fetchRestaurant = async () => {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
      if (data) setRestaurant(data);
    };

    fetchRestaurant();
  }, [restaurantId]);

  useEffect(() => {
    if (initialOrderId && restaurantId) {
      searchOrder(initialOrderId);
    }
  }, [initialOrderId, restaurantId]);

  const searchOrder = async (query: string) => {
    if (!query || !restaurantId) return;
    setLoading(true);
    setOrder(null);
    const supabase = createBrowserSupabase();
    
    // First try exact ID
    let { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, price)), tables(table_number)')
      .eq('restaurant_id', restaurantId)
      .eq('id', query)
      .maybeSingle();

    // If not found by UUID, try daily order number (if query is a number)
    if (!data && !isNaN(Number(query))) {
      const { data: numData } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name, price)), tables(table_number)')
        .eq('restaurant_id', restaurantId)
        .eq('daily_order_number', Number(query))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      data = numData;
    }

    if (data) setOrder(data);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-bill, #printable-bill * {
            visibility: visible;
          }
          #printable-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm; /* Standard receipt width */
            padding: 0;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-indigo-600" />
            Customer Bills
          </h1>
          <p className="text-neutral-500 mt-1">Generate and print order receipts</p>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Enter Order ID or Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchOrder(searchTerm)}
              className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full shadow-sm"
            />
          </div>
          <button 
            onClick={() => searchOrder(searchTerm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            Find
          </button>
        </div>
      </div>

      <div className="flex justify-center no-print mt-8">
        {loading ? (
          <div className="p-12"><div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
        ) : !order ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 w-full max-w-md flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">No bill loaded</h3>
            <p className="text-neutral-500 mt-1 text-sm">Search for an order above to generate its bill.</p>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-4">
            <button 
              onClick={handlePrint}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-sm flex justify-center items-center gap-2 transition-transform active:scale-95"
            >
              <Printer className="h-5 w-5" /> Print Bill
            </button>
            
            {/* The actual bill that gets printed */}
            <div id="printable-bill" className="bg-white border border-neutral-200 shadow-sm p-6 text-sm text-neutral-900 mx-auto w-full" style={{ fontFamily: 'monospace' }}>
              <div className="text-center mb-4 border-b border-dashed border-neutral-400 pb-4">
                <h2 className="text-xl font-black uppercase mb-1">{restaurant?.name || 'TakeaBite Partner'}</h2>
                {restaurant?.address && <p className="text-xs">{restaurant.address}</p>}
                {restaurant?.contact_email && <p className="text-xs">{restaurant.contact_email}</p>}
                <p className="text-xs mt-2">GSTIN: {restaurant?.gstin || 'NOT PROVIDED'}</p>
              </div>

              <div className="mb-4 text-xs">
                <p>Date: {new Date(order.created_at).toLocaleString()}</p>
                <p>Order No: #{order.daily_order_number || order.id.slice(0, 8)}</p>
                {order.tables && <p>Table: {order.tables.table_number}</p>}
                {order.customer_name && <p>Customer: {order.customer_name}</p>}
                {order.payment_status === 'paid' ? (
                  <p>Payment: {order.payment_method.toUpperCase()} (PAID)</p>
                ) : (
                  <p>Payment: {order.payment_method.toUpperCase()} (PENDING)</p>
                )}
              </div>

              <table className="w-full text-xs mb-4">
                <thead className="border-y border-dashed border-neutral-400">
                  <tr>
                    <th className="py-1 text-left font-normal">Item</th>
                    <th className="py-1 text-center font-normal">Qty</th>
                    <th className="py-1 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-b border-dashed border-neutral-400">
                  {order.order_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-1 text-left pr-2 truncate max-w-[120px]">{item.menu_items?.name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-xs space-y-1 border-b border-dashed border-neutral-400 pb-4 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{(order.total_amount - (order.tax_amount || 0)).toFixed(2)}</span>
                </div>
                {order.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>GST (2%)</span>
                    <span>{(order.tax_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-dashed border-neutral-200">
                  <span>TOTAL</span>
                  <span>₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-xs">
                <p>Thank you for visiting!</p>
                <p className="mt-1">Powered by TakeaBite</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
