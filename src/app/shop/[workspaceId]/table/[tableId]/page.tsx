"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CustomerTopBar } from "@/components/customer/CustomerTopBar";
import { CustomerBottomNav } from "@/components/customer/CustomerBottomNav";
import { CategoryChips } from "@/components/customer/CategoryChips";
import { ProductCard } from "@/components/customer/ProductCard";
import { StickyCartButton } from "@/components/customer/StickyCartButton";
import { useCartStore } from "@/store/useCartStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicMenuItems } from "@/actions/menu";
import { getRestaurantProfile, getTableDetails } from "@/actions/restaurant";
import { createBrowserSupabase } from "@/lib/supabase/client";

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

export default function DigitalMenuPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const tableId = params.tableId as string;
  
  // Wait for client to hydrate to avoid mismatch with persisted Zustand store
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createBrowserSupabase();
    const channel = supabase.channel(`public:menu_items:shop_table_${workspaceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'menu_items', filter: `restaurant_id=eq.${workspaceId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['menuPublic', workspaceId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId, queryClient]);

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

  // Fetch table details
  const { data: tableData } = useQuery({
    queryKey: ['table', tableId],
    queryFn: () => getTableDetails(tableId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!tableId,
  });
  const table: any = tableData;
  const tableLabel = table ? (table.table_name || `Table ${table.table_number}`) : `Table ${tableId.substring(0,4)}`;

  // Fetch menu items
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['menuPublic', workspaceId],
    queryFn: () => getPublicMenuItems(workspaceId).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!workspaceId,
  });

  const allItems = menuData?.items || [];
  
  const menuCategories = menuData?.menuCategories || [];
  const hiddenCategories = menuCategories.filter((c: any) => !c.is_active).map((c: any) => c.name);

  // Show all items (including out of stock) and exclude hidden categories
  const menuItems = allItems
    .filter((item: ShopMenuItem) => !hiddenCategories.includes(item.category || 'Other'))
    .sort((a: ShopMenuItem, b: ShopMenuItem) => a.display_order - b.display_order);

  // Dynamic Categories (sorted by DB display_order)
  const activeDbCategories = menuCategories.filter((c: any) => c.is_active).sort((a: any, b: any) => a.display_order - b.display_order).map((c: any) => c.name);
  const categories = activeDbCategories.length > 0 
    ? activeDbCategories.filter((c: string) => menuItems.some((i: ShopMenuItem) => i.category === c))
    : Array.from(new Set(menuItems.map((i: ShopMenuItem) => i.category || 'Other')));
  
  const [activeCategory, setActiveCategory] = useState("All");
  
  useEffect(() => {
    if (categories.length > 0 && activeCategory === "All") {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);
  
  const { items: allCartItems, addItem, updateQuantity } = useCartStore();
  const cartItems = allCartItems.filter(i => i.workspaceId === workspaceId && i.tableId === tableId);

  const handleUpdateQuantity = (id: string, delta: number) => {
    updateQuantity(id, workspaceId, delta);
  };

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

  const filteredItems = menuItems.filter((item: ShopMenuItem) => 
    activeCategory === "All" ? true : item.category === activeCategory
  );

  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const basePath = tableId ? `/shop/${workspaceId}/table/${tableId}` : `/shop/${workspaceId}`;

  if (!mounted || isShopLoading || isMenuLoading) {
    return (
      <div className="bg-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl p-4">
        {/* Skeleton Top Bar */}
        <div className="animate-pulse flex items-center justify-between mb-8 mt-2">
          <div className="flex gap-3 items-center">
            <div className="h-12 w-12 bg-surface-variant rounded-full"></div>
            <div className="h-5 w-32 bg-surface-variant rounded"></div>
          </div>
          <div className="h-10 w-10 bg-surface-variant rounded-full"></div>
        </div>
        {/* Skeleton Categories */}
        <div className="flex gap-3 mb-8 overflow-hidden">
          {[1,2,3,4].map(i => <div key={i} className="h-20 w-20 bg-surface-variant rounded-2xl shrink-0 animate-pulse"></div>)}
        </div>
        {/* Skeleton Title */}
        <div className="h-8 w-48 bg-surface-variant rounded mb-6 animate-pulse"></div>
        {/* Skeleton Cards */}
        <div className="grid grid-cols-2 gap-card-gutter">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-surface-variant h-64 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
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

  if (!tableId) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <span className="material-symbols-outlined text-[64px] text-error mb-4">table_restaurant</span>
          <h1 className="text-2xl font-bold text-on-surface mb-2">Invalid Table</h1>
          <p className="text-secondary">Please scan the QR code located on your table to start ordering.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen flex flex-col mx-auto max-w-md border-x border-surface-variant relative shadow-2xl">
      <CustomerTopBar shopName={shop.name} shopLogoUrl={shop.logo_url} />

      <main className="flex-grow pb-40 px-container-padding">
        {categories.length > 0 && (
          <CategoryChips 
            categories={categories} 
            activeCategory={activeCategory} 
            onSelect={setActiveCategory} 
          />
        )}

        <div className="mb-element-gap-md flex justify-between items-end">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{activeCategory} Menu</h2>
          {tableId && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
              {tableLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-card-gutter">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <ProductCard 
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                imageUrl={item.image_url}
                isVeg={item.is_veg}
                isAvailable={!item.is_out_of_stock}
                isBestSeller={item.display_order < 3} // simple placeholder for popular items
                quantity={cartItems.find(i => i.id === item.id)?.quantity || 0}
                onAdd={handleAddToCart}
                onUpdateQuantity={handleUpdateQuantity}
              />
            ))
          ) : (
            <div className="col-span-2 py-10 text-center text-secondary">
              No items available in this category.
            </div>
          )}
        </div>
      </main>

      <StickyCartButton 
        itemCount={cartCount} 
        totalPrice={cartTotal} 
        checkoutUrl={`${basePath}/cart`} 
      />

      <CustomerBottomNav 
        workspaceId={workspaceId} 
        tableId={tableId} 
        activeTab="home" 
      />
    </div>
  );
}
