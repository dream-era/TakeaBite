"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { ProductCard } from "@/components/customer/ProductCard";
import { StickyCartButton } from "@/components/customer/StickyCartButton";
import { useCartStore } from "@/store/useCartStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicMenuItems } from "@/actions/menu";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { getRestaurantProfile } from "@/actions/restaurant";

type ShopMenuItem = {
  id: string;
  is_available: boolean;
  is_out_of_stock?: boolean;
  display_order: number;
  category: string | null;
  name: string;
  price: number;
  image_url: string | null;
  is_veg?: boolean | null;
  description?: string | null;
};

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string | undefined;
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createBrowserSupabase();
    const channel = supabase.channel(`public:menu_items:shop_search_${workspaceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${workspaceId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['menuPublic', workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch restaurant details
  const { data: restaurantData, isLoading: isShopLoading } = useQuery({
    queryKey: ['restaurant', workspaceId],
    queryFn: () => getRestaurantProfile(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!workspaceId,
  });

  const shop: any = restaurantData;

  // Fetch menu items
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['menu', workspaceId],
    queryFn: () => getPublicMenuItems(workspaceId).then((res: any) => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!workspaceId,
  });

  const allItems = menuData?.items || [];
  const menuCategories = menuData?.menuCategories || [];
  const hiddenCategories = menuCategories.filter((c: any) => !c.is_active).map((c: any) => c.name);

  // Filter available items and remove hidden categories
  const menuItems = allItems.filter((item: ShopMenuItem) => item.is_available && !hiddenCategories.includes(item.category || 'Other'));

  const { items: allCartItems, addItem } = useCartStore();
  const cartItems = allCartItems.filter(i => i.workspaceId === workspaceId && i.tableId === tableId);

  const handleAddToCart = (id: string) => {
    const item: ShopMenuItem | undefined = menuItems.find((i: ShopMenuItem) => i.id === id);
    if (!item) return;
    
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.image_url || '',
      workspaceId,
      tableId
    });
  };

  const filteredItems = searchQuery.trim() === "" 
    ? [] 
    : menuItems.filter((item: ShopMenuItem) => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const basePath = tableId ? `/shop/${workspaceId}/table/${tableId}` : `/shop/${workspaceId}`;

  if (!mounted) return null;

  if (isShopLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin material-symbols-outlined text-primary text-4xl">refresh</div>
    </div>;
  }

  if (!shop) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <span className="material-symbols-outlined text-[64px] text-error mb-4">storefront</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Shop Not Found</h1>
          <p className="text-secondary">The QR code you scanned might be invalid or the restaurant is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      <CustomerTopBar shopName={shop.name} />

      <main className="flex-grow pb-32 px-container-padding py-4">
        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-secondary">search</span>
          </div>
          <input 
            type="text" 
            placeholder="Search for dishes, categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-surface-variant rounded-full py-4 pl-12 pr-4 font-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary transition-colors shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <span className="material-symbols-outlined text-secondary hover:text-on-surface">close</span>
            </button>
          )}
        </div>

        {isMenuLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin material-symbols-outlined text-primary text-2xl">refresh</div>
          </div>
        ) : searchQuery.trim() === "" ? (
          <div className="flex flex-col items-center justify-center text-center mt-12 opacity-60">
            <span className="material-symbols-outlined text-[64px] text-surface-variant mb-4">manage_search</span>
            <p className="font-body-md text-secondary">Start typing to search for your favorite food.</p>
          </div>
        ) : (
          <>
            <h2 className="font-headline-md text-on-surface mb-4">
              {filteredItems.length} {filteredItems.length === 1 ? 'Result' : 'Results'} for &quot;{searchQuery}&quot;
            </h2>
            <div className="grid grid-cols-2 gap-card-gutter">
              {filteredItems.length > 0 ? (
                filteredItems.map((item: ShopMenuItem) => (
                  <ProductCard 
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    price={item.price}
                    imageUrl={item.image_url || ''}
                    isVeg={item.is_veg}
                    isAvailable={!item.is_out_of_stock}
                    onAdd={handleAddToCart}
                  />
                ))
              ) : (
                <div className="col-span-2 py-10 text-center text-secondary">
                  No items found matching your search.
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <StickyCartButton 
        itemCount={cartCount} 
        totalPrice={cartTotal} 
        checkoutUrl={`${basePath}/checkout`} 
      />

      <CustomerBottomNav 
        workspaceId={workspaceId} 
        activeTab="search" 
        tableId={tableId}
      />
    </div>
  );
}
