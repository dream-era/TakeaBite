"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffStore } from "@/store/useStaffStore";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Search, Package, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import FoodImage from '@/components/shared/FoodImage';
import { nameToImageSlug } from '@/data/foodLibrary';
import type { MenuItem } from "@/types/database";

type CategoryFilter = 'All' | 'Food' | 'Juice' | 'Beverage' | 'Snacks';

export default function StockManagementPage() {
  const { currentSession } = useStaffStore();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [loading, setLoading] = useState(true);

  // Derive allowed stations based on role
  const role = currentSession?.role;
  const isFoodOnly = role === 'chef' || role === 'cook';
  const isJuiceOnly = role === 'juice_maker' || role === 'juice';
  
  const themeColor = isFoodOnly ? 'red' : isJuiceOnly ? 'orange' : 'blue';

  const fetchMenu = useCallback(async () => {
    if (!currentSession) return;
    try {
      const supabase = createBrowserSupabase();
      const restaurantId = currentSession.restaurantId || currentSession.workspaceId;
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId);
        
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error("Error fetching menu items:", err);
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (!currentSession) return;
    const supabase = createBrowserSupabase();
    
    // Subscribe to real-time changes on menu_items
    const channel = supabase.channel('stock_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'menu_items',
        filter: `restaurant_id=eq.${currentSession.restaurantId || currentSession.workspaceId}`
      }, (payload) => {
        setItems(current => current.map(item => 
          item.id === payload.new.id ? { ...item, ...payload.new } : item
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // Filter items based on staff role and user filters
  const filteredItems = items.filter(item => {
    // 1. Role filtering
    if (isFoodOnly && item.station !== 'food' && item.station !== 'both') return false;
    if (isJuiceOnly && item.station !== 'juice' && item.station !== 'both') return false;

    // 2. Category filtering
    if (activeCategory !== 'All') {
      if (item.category.toLowerCase() !== activeCategory.toLowerCase()) return false;
    }

    // 3. Search filtering
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  const availableCount = filteredItems.filter(i => !i.is_out_of_stock).length;
  const outOfStockCount = filteredItems.filter(i => i.is_out_of_stock).length;

  const handleToggle = async (item: MenuItem) => {
    // Optimistic update
    const newValue = !item.is_out_of_stock;
    setItems(current => current.map(i => i.id === item.id ? { ...i, is_out_of_stock: newValue } : i));
    
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase
        .from('menu_items')
        .update({ 
          is_out_of_stock: newValue,
          out_of_stock_by: currentSession?.staffId || currentSession?.id || null,
          out_of_stock_at: newValue ? new Date().toISOString() : null
        })
        .eq('id', item.id)
        .eq('restaurant_id', item.restaurant_id);
        
      if (error) throw error;
    } catch (err) {
      setItems(current => current.map(i => i.id === item.id ? { ...i, is_out_of_stock: item.is_out_of_stock } : i));
      toast.error("Failed to update stock status");
    }
  };

  const categories: CategoryFilter[] = ['All', 'Food', 'Juice', 'Beverage', 'Snacks'];

  return (
    <StaffLayout allowedRoles={['chef', 'servant', 'juice_maker', 'juice', 'server', 'cook']} themeColor={themeColor}>
      <header className="bg-[#1a1a1a] text-white px-4 py-4 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-white">
              <Package className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-[17px] leading-tight tracking-wide flex items-center gap-2">
                Stock Management
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live Sync Active"></span>
              </h1>
              <p className="text-[#999999] text-[11px]">Manage menu availability</p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center">
            <span className="text-xs font-medium text-neutral-500">Total</span>
            <span className="text-lg font-bold text-neutral-900">{filteredItems.length}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 shadow-sm flex flex-col items-center">
            <span className="text-xs font-medium text-emerald-600">Available</span>
            <span className="text-lg font-bold text-emerald-700">{availableCount}</span>
          </div>
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-sm flex flex-col items-center">
            <span className="text-xs font-medium text-rose-600">Out of Stock</span>
            <span className="text-lg font-bold text-rose-700">{outOfStockCount}</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search menu items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat 
                  ? 'bg-neutral-900 text-white' 
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-10 text-center text-sm text-neutral-500 font-medium">Loading menu items...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500 font-medium bg-white rounded-xl border border-neutral-200">
            No items found.
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white rounded-xl p-3 border border-neutral-200 shadow-sm flex items-center gap-3 h-full">
                {/* Image placeholder */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 relative">
                  <FoodImage
                    imageUrl={item.image_url}
                    imageSlug={nameToImageSlug(item.name)}
                    itemName={item.name}
                    size="sm"
                    className="w-full h-full rounded-lg"
                  />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="font-bold text-neutral-900 text-sm sm:text-[15px] truncate block w-full">{item.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase bg-neutral-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {item.category}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${!item.is_out_of_stock ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {!item.is_out_of_stock ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                      {!item.is_out_of_stock ? 'IN STOCK' : 'OUT OF STOCK'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="shrink-0 flex items-center">
                  {!item.is_out_of_stock ? (
                    <button
                      onClick={() => handleToggle(item)}
                      className="px-2.5 py-2 sm:px-3 sm:py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] sm:text-[11px] rounded-lg border border-rose-200 transition-colors whitespace-nowrap"
                    >
                      Mark Out Of Stock
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle(item)}
                      className="px-2.5 py-2 sm:px-3 sm:py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-[10px] sm:text-[11px] rounded-lg border border-emerald-200 transition-colors whitespace-nowrap"
                    >
                      Enable Again
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
