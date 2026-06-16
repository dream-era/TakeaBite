"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { getRestaurantProfile, getTableDetails } from "@/actions/restaurant";
import { getOrCreateDeviceCookie } from '@/lib/deviceCookie';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [phone, setPhone] = useState('');
  const { items: allCartItems, clearCart, orderType } = useCartStore();

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant', workspaceId],
    queryFn: () => getRestaurantProfile(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data as any;
    }),
    enabled: !!workspaceId,
  });

  const { data: tableData } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => getTableDetails(tableId as string).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!tableId,
  });
  const table: any = tableData;
  const tableLabel = table ? (table.table_name || `Table ${table.table_number}`) : (tableId ? `Table` : '');

  const items = allCartItems.filter(i => i.workspaceId === workspaceId && i.tableId === tableId);

  // Redirect back to cart if order type is somehow null
  useEffect(() => {
    if (mounted && !orderType && items.length > 0) {
      router.replace(tableId ? `/shop/${workspaceId}/table/${tableId}/cart` : `/shop/${workspaceId}/cart`);
    }
  }, [mounted, orderType, items.length, router, workspaceId, tableId]);

  const paymentEnabled = restaurantData?.payment_enabled || false;
  const [selectedMethod, setSelectedMethod] = useState<'online' | 'cash'>('cash');
  
  useEffect(() => {
    if (!paymentEnabled && selectedMethod === 'online') {
      setSelectedMethod('cash');
    }
  }, [paymentEnabled, selectedMethod]);

  const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const processingFee = selectedMethod === 'online' ? subtotal * 0.02 : 0;
  const total = subtotal + processingFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const orderItems = items.map(cartItem => ({
      menuItemId: cartItem.id,
      quantity: cartItem.quantity
    }));

    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantId: workspaceId,
          ...(tableId ? { tableId } : {}),
          items: orderItems,
          paymentMethod: selectedMethod,
          specialInstructions: "",
          orderType: orderType,
          deviceCookie: getOrCreateDeviceCookie(),
          phone: phone || undefined,
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to place order");
      }

      const { setConfirmedOrderDetails, setPlacedOrderId } = useCartStore.getState();
      
      if (selectedMethod === 'online' && result.razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => {
          const rzp = new (window as any).Razorpay({
            key: result.razorpay.keyId,
            amount: result.razorpay.amount,
            currency: result.razorpay.currency,
            order_id: result.razorpay.orderId,
            name: restaurantData?.name || "Restaurant",
            description: 'Food order',
            config: {
              display: {
                blocks: {
                  utib: { name: 'Pay via UPI', instruments: [{ method: 'upi', flows: ['collect', 'intent'] }] },
                  other: { name: 'Other Payment Methods', instruments: [{ method: 'card' }, { method: 'wallet', wallets: ['paytm', 'phonepe'] }, { method: 'netbanking' }] },
                },
                sequence: ['block.utib', 'block.other'],
                preferences: { show_default_blocks: false },
              },
            },
            handler: () => { // response unused
              setConfirmedOrderDetails(result.orderDetails);
              setPlacedOrderId(result.orderId || result.id);
              clearCart(workspaceId);
              const nextUrl = tableId 
                ? `/shop/${workspaceId}/table/${tableId}/order-confirmation?id=${result.orderId || result.id}&token=${result.orderToken}` 
                : `/shop/${workspaceId}/order-confirmation?id=${result.orderId || result.id}&token=${result.orderToken}`;
              router.push(nextUrl);
            },
            modal: {
              ondismiss: () => {
                toast.error("Payment cancelled");
              },
            },
            theme: { color: '#E8570C' },
          });
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        setConfirmedOrderDetails(result.orderDetails);
        setPlacedOrderId(result.orderId || result.id);
        toast.success("Order placed successfully");
        clearCart(workspaceId);
        const nextUrl = tableId 
          ? `/shop/${workspaceId}/table/${tableId}/order-confirmation?id=${result.orderId || result.id}&token=${result.orderToken}` 
          : `/shop/${workspaceId}/order-confirmation?id=${result.orderId || result.id}&token=${result.orderToken}`;
        router.push(nextUrl);
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      {/* Header */}
      <header className="bg-background docked full-width top-0 z-40 sticky border-b border-surface-variant">
        <div className="flex justify-between items-center w-full px-container-padding py-4">
          <button onClick={() => router.back()} className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-150 flex items-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">Checkout</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="flex-grow pb-32 px-container-padding py-6 space-y-8">
        
        {/* Banner */}
        <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between border border-surface-container-high">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">
              {orderType === 'eat_here' ? 'restaurant' : 'takeout_dining'}
            </span>
            <span className="font-label-md text-on-surface">
              {orderType === 'eat_here' ? 'Eat Here' : 'Takeaway / Counter Pickup'}
            </span>
          </div>
          {orderType === 'eat_here' && tableId && <span className="font-headline-md text-primary bg-primary/10 px-3 py-1 rounded-md">{tableLabel}</span>}
        </div>

        <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
          <div>
            <h2 className="font-headline-md text-on-surface mb-4">Your Details (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="font-label-md text-on-surface block mb-2">Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  className="w-full bg-surface-container-lowest border border-surface-variant rounded-xl p-4 font-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="font-label-md text-on-surface block mb-2">
                  Mobile Number
                  <span className="ml-1 text-xs text-gray-400">(for order updates)</span>
                </label>
                <div className="flex items-center bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                  <span className="px-4 py-4 bg-surface-container-low text-secondary border-r border-surface-variant text-sm font-body-md">+91</span>
                  <input 
                    type="tel" 
                    maxLength={10}
                    placeholder="Enter mobile number" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\\D/g, ''))}
                    className="flex-1 px-4 py-4 font-body-md text-on-surface placeholder:text-secondary focus:outline-none bg-transparent"
                  />
                </div>
                <p className="text-xs text-secondary mt-2">
                  Optional — helps you track this order and view past orders
                </p>
              </div>
            </div>
          </div>

          <div className="h-px w-full dashed-separator my-6"></div>

          <div>
            <h2 className="font-headline-md text-on-surface mb-4">Payment Method</h2>
            
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 10,
              border: selectedMethod === 'cash'
                ? '2px solid #E8570C' : '1px solid #e5e7eb',
              cursor: 'pointer', marginBottom: 10,
              background: selectedMethod === 'cash' ? '#fff7ed' : '#fff',
            }}>
              <input type="radio" name="payment" value="cash"
                checked={selectedMethod === 'cash'}
                onChange={() => setSelectedMethod('cash')}
                style={{ accentColor: '#E8570C' }}
              />
              <span style={{ fontSize: 20 }}>💵</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Pay at Counter (Cash)</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Pay your server directly</div>
              </div>
            </label>

            {paymentEnabled && restaurantData?.razorpay_key_id ? (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 10,
                border: selectedMethod === 'online'
                  ? '2px solid #E8570C' : '1px solid #e5e7eb',
                cursor: 'pointer', marginBottom: 10,
                background: selectedMethod === 'online' ? '#fff7ed' : '#fff',
              }}>
                <input type="radio" name="payment" value="online"
                  checked={selectedMethod === 'online'}
                  onChange={() => setSelectedMethod('online')}
                  style={{ accentColor: '#E8570C' }}
                />
                <span style={{ fontSize: 20 }}>📱</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Pay Online</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    UPI, Google Pay, PhonePe, Paytm, Card
                  </div>
                </div>
                {/* Payment app icons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {['G', 'P', 'PT', '💳'].map((icon, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: ['#4285F4','#5F259F','#002970','#f3f4f6'][i],
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 10,
                      fontWeight: 700, color: i < 3 ? '#fff' : '#374151',
                    }}>{icon}</div>
                  ))}
                </div>
              </label>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: '#f9fafb', border: '1px dashed #d1d5db',
                marginBottom: 10,
              }}>
                <div style={{ fontSize: 13, color: '#9ca3af', display: 'flex', gap: 8 }}>
                  <span>📱</span>
                  <span>Online payments not available at this shop yet</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-px w-full dashed-separator my-6"></div>

          <div>
            <h2 className="font-headline-md text-on-surface mb-4">Order Summary</h2>
            <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-4 space-y-3">
              <div className="flex justify-between text-secondary">
                <span className="font-body-md">Subtotal</span>
                <span className="font-body-md">₹{subtotal.toFixed(2)}</span>
              </div>
              {selectedMethod === 'online' && (
                <div className="flex justify-between text-secondary">
                  <span className="font-body-md">Online Processing Fee (2%)</span>
                  <span className="font-body-md">₹{processingFee.toFixed(2)}</span>
                </div>
              )}
              <div className="h-px w-full dashed-separator my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-headline-md text-on-surface">Grand Total</span>
                <span className="font-headline-md text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>
      </main>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-surface shadow-[0px_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md pb-safe">
        <div className="max-w-md mx-auto p-4 flex items-center gap-4">
          <div className="flex flex-col flex-1">
            <span className="font-label-md text-secondary uppercase tracking-wider text-xs">Grand Total</span>
            <span className="font-headline-md text-on-surface">₹{total.toFixed(2)}</span>
          </div>
          <button 
            form="checkout-form"
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 flex justify-center items-center h-14 bg-primary text-on-primary font-label-lg rounded-xl shadow-lg transition-all active:scale-[0.98] ${isSubmitting ? 'opacity-80 cursor-wait pointer-events-none' : 'hover:opacity-90'}`}
          >
            {isSubmitting ? (
               <span className="material-symbols-outlined animate-spin">refresh</span>
            ) : (
              "Place Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
