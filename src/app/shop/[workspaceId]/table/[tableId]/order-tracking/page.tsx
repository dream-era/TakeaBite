"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getRestaurantProfile } from "@/actions/restaurant";
import { getDeviceCookie } from "@/lib/deviceCookie";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;

  const [deviceCookie, setDeviceCookie] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [urlToken, setUrlToken] = useState<string | null>(null);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  
  useEffect(() => {
    setDeviceCookie(getDeviceCookie());
    const phone = localStorage.getItem('tb_phone');
    setSavedPhone(phone);
    if (!phone) setShowPhonePrompt(true);
    
    const searchParams = new URLSearchParams(window.location.search);
    setUrlToken(searchParams.get('token'));
  }, []);
  
  const queryClient = useQueryClient();
  const supabase = createBrowserSupabase();

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', workspaceId],
    queryFn: () => getRestaurantProfile(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data as any;
    }),
    enabled: !!workspaceId,
  });

  // Fetch recent active orders for this device
  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer-orders', workspaceId, deviceCookie, savedPhone, urlToken],
    queryFn: async () => {
      let resolvedOrders: any[] = [];
      
      if (urlToken) {
        const { data } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_items ( name )
            ),
            tables(table_number)
          `)
          .eq('order_token', urlToken)
          .eq('restaurant_id', workspaceId)
          .single();
        if (data) resolvedOrders = [data];
      }

      if (savedPhone || deviceCookie) {
        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_items ( name )
            ),
            tables(table_number)
          `)
          .eq('restaurant_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (savedPhone) {
          query = query.eq('phone', savedPhone);
        } else if (deviceCookie) {
          query = query.eq('device_cookie', deviceCookie);
        }

        const { data, error } = await query;
        if (!error && data) {
          const existing = new Set(resolvedOrders.map(o => o.id));
          resolvedOrders = [...resolvedOrders, ...data.filter(o => !existing.has(o.id))];
        }
      }
      
      return resolvedOrders;
    },
    enabled: !!workspaceId && (!!deviceCookie || !!savedPhone || !!urlToken),
  });

  // Supabase Realtime Subscription for Instant Updates
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    
    const uuids = orders.map((o: any) => o.id).join(',');
    
    const channel = supabase.channel('customer-tracking')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=in.(${uuids})` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-orders', workspaceId, deviceCookie, savedPhone, urlToken] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['customer-orders', workspaceId, deviceCookie, savedPhone, urlToken] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, workspaceId, deviceCookie, savedPhone, urlToken, orders]);

  const handleSavePhone = async () => {
    if (!phoneInput) return;
    try {
      const cleanPhone = `+91${phoneInput.replace(/\\D/g, '')}`;
      localStorage.setItem('tb_phone', cleanPhone);
      setSavedPhone(cleanPhone);
      
      if (urlToken) {
        await supabase.from('orders').update({ phone: cleanPhone }).eq('order_token', urlToken);
      } else if (deviceCookie) {
        await supabase.from('orders').update({ phone: cleanPhone }).eq('device_cookie', deviceCookie);
      }
      
      setShowPhonePrompt(false);
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    } catch(e) {
      console.error("Failed to save phone", e);
    }
  };

  const getStepForStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'served': return 4;
      default: return 1;
    }
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      <CustomerTopBar shopName={restaurantData?.name || ''} />

      <main className="flex-grow px-container-padding py-6 pb-32">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 flex items-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">Your Orders</h1>
          <div className="w-6" />
        </div>

        {showPhonePrompt && (urlToken || deviceCookie) && !savedPhone && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 relative">
            <button onClick={() => { setShowPhonePrompt(false); localStorage.setItem('tb_phone', 'skip'); }} className="absolute top-2 right-2 text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <p className="font-body-md text-on-surface font-semibold mb-2 pr-4">Want updates on WhatsApp? Save your number</p>
            <div className="flex gap-2">
              <input 
                type="tel" 
                placeholder="Mobile Number" 
                value={phoneInput} 
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-grow bg-white border border-surface-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={handleSavePhone} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap active:scale-95 transition-transform">
                Save
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin material-symbols-outlined text-primary text-4xl">refresh</div>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20 text-secondary">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">receipt_long</span>
            <p className="mb-6">No orders found.</p>
            <button 
              onClick={() => router.push(tableId ? `/shop/${workspaceId}/table/${tableId}` : `/shop/${workspaceId}`)}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
            >
              Go to Menu
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order: { id: string; status: string; special_instructions: string | null; table_id: string | null; created_at: string; updated_at: string; order_items: { id: string; quantity: number; price: number; menu_items: { name: string } }[]; total_amount: number; daily_order_number: number | null; }) => {
              const currentStep = getStepForStatus(order.status);
              const parsedOrderType = (order as any).order_type || (order.table_id ? 'eat_here' : 'takeaway');
              
              const steps = [
                { id: 1, title: "Order Received", desc: "We've got your order", icon: "receipt_long", time: new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) },
                { id: 2, title: "Preparing", desc: "Chefs are working their magic", icon: "skillet", time: "" },
                { id: 3, title: "Ready", desc: "Your food is ready to be served!", icon: "room_service", time: "" },
                { id: 4, title: "Completed", desc: "Enjoy your meal", icon: "check_circle", time: order.status === 'served' ? new Date(order.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "" }
              ];

              return (
                <div key={order.id} className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6">
                  <div className="flex justify-between items-center border-b border-surface-variant pb-4 mb-6">
                    <div>
                      <p className="font-label-md text-secondary uppercase tracking-wider text-[10px]">Order No</p>
                      <p className="font-headline-md text-on-surface">#{order.daily_order_number}</p>
                    </div>
                    <div className="bg-surface-container-high px-3 py-1 rounded-md">
                      <span className="font-label-md text-primary flex items-center gap-1">
                        {parsedOrderType === 'takeaway' ? '🛍 Takeaway' : '🍽 Eat Here'}
                        {tableId && parsedOrderType === 'eat_here' ? ` - Table ${tableId}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="mb-6 space-y-2">
                    {order.order_items?.map((item: { id: string; quantity: number; price: number; menu_items: { name: string } }) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-on-surface"><span className="font-bold">{item.quantity}x</span> {item.menu_items?.name}</span>
                        <span className="text-secondary">₹{item.price}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-dashed border-surface-variant flex justify-between font-bold text-on-surface">
                      <span>Total</span>
                      <span>₹{order.total_amount}</span>
                    </div>
                  </div>

                  <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[23px] top-4 bottom-8 w-0.5 bg-surface-variant"></div>
                    
                    {steps.map((step) => {
                      const isCompleted = currentStep > step.id;
                      const isActive = currentStep === step.id;
                      const isPending = currentStep < step.id;

                      return (
                        <div key={step.id} className="relative flex gap-4 mb-8 last:mb-0">
                          <div className="relative z-10 shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-surface-container-lowest shadow-sm transition-colors ${
                              isActive ? 'bg-primary text-on-primary animate-pulse-soft' : 
                              isCompleted ? 'bg-primary text-on-primary' : 
                              'bg-surface-variant text-secondary'
                            }`}>
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isCompleted || isActive ? "'FILL' 1" : "'FILL' 0" }}>
                                {step.icon}
                              </span>
                            </div>
                          </div>
                          
                          <div className={`flex-1 pt-1 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
                            <div className="flex justify-between items-start">
                              <h4 className={`font-label-lg ${isActive ? 'text-primary' : 'text-on-surface'}`}>{step.title}</h4>
                              <span className="font-label-md text-xs text-secondary">{step.time}</span>
                            </div>
                            <p className="font-body-md text-secondary text-sm mt-1">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      <CustomerBottomNav workspaceId={workspaceId} activeTab="orders" />
    </div>
  );
}
