"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from "react";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import FoodLibraryPicker from '@/components/menu/FoodLibraryPicker';
import { MenuSquare, Plus, Search, Filter, Edit, Trash2, XCircle, ChevronRight, Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useRestaurantId } from "@/store/authStore";
import FoodImage from '@/components/shared/FoodImage';
import { nameToImageSlug } from '@/data/foodLibrary';
import { 
  getMenuItems, addMenuItem, deleteMenuItem, toggleItemAvailability, updateMenuItem, uploadMenuItemImage,
  addCategory, updateCategory, deleteCategory, toggleCategoryStatus 
} from "@/actions/menu";

export default function MenuManagementPage() {
  const restaurantId = useRestaurantId();
  const queryClient = useQueryClient();

  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => getMenuItems(restaurantId!).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!restaurantId,
  });

  const items = menuData?.items || [];
  const menuCategories = menuData?.menuCategories || [];

  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("Newest First");

  // Category Form State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: ''
  });

  // Item Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: (newItem: Parameters<typeof addMenuItem>[0]) => addMenuItem(newItem),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Item added successfully");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      setIsAddModalOpen(false);
      setFormData({ name: '', description: '', price: '', category: '' });
    },
    onError: () => toast.error("Failed to add item")
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMenuItem(id),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Item deleted");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    },
    onError: () => toast.error("Failed to delete item")
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string, isAvailable: boolean }) => toggleItemAvailability(id, isAvailable),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    },
    onError: () => toast.error("Failed to update status")
  });

  const editMutation = useMutation({
    mutationFn: (updatedItem: Parameters<typeof updateMenuItem>[0]) => updateMenuItem(updatedItem),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Item updated successfully");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      setEditingItemId(null);
      setFormData({ name: '', description: '', price: '', category: '' });
    },
    onError: () => toast.error("Failed to update item")
  });

  // Category Mutations
  const addCategoryMut = useMutation({
    mutationFn: addCategory,
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      setIsCategoryModalOpen(false);
    }
  });

  const editCategoryMut = useMutation({
    mutationFn: updateCategory,
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      setEditingCategoryId(null);
    }
  });

  const deleteCategoryMut = useMutation({
    mutationFn: deleteCategory,
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  });

  const toggleCategoryMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => toggleCategoryStatus(id, isActive),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.error); return; }
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  });

  const handleEditClick = (item: any) => {
    setEditingItemId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category || ''
    });
  };

  const handleSaveItem = () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill in required fields");
      return;
    }
    
    if (editingItemId) {
      editMutation.mutate({
        itemId: editingItemId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
      });
    } else {
      addMutation.mutate({
        restaurantId: restaurantId!,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        station: "food",
        isVeg: true,
        isAvailable: true,
      });
    }
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) {
      toast.error("Name is required");
      return;
    }
    if (editingCategoryId) {
      editCategoryMut.mutate({ id: editingCategoryId, ...categoryForm });
    } else {
      addCategoryMut.mutate({ restaurantId: restaurantId!, ...categoryForm });
    }
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || ''
    });
  };

  const clearFilters = () => {
    setFilterCategories([]);
    setFilterStatus([]);
    setPriceMin("");
    setPriceMax("");
    setSortBy("Newest First");
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    // Filters
    if (filterCategories.length > 0) {
      result = result.filter(i => filterCategories.includes(i.category));
    }
    if (filterStatus.length > 0) {
      result = result.filter(i => {
        const status = i.is_available ? "Available" : "Out of Stock";
        return filterStatus.includes(status);
      });
    }
    if (priceMin) {
      result = result.filter(i => i.price >= parseFloat(priceMin));
    }
    if (priceMax) {
      result = result.filter(i => i.price <= parseFloat(priceMax));
    }

    // Sort
    switch (sortBy) {
      case "Oldest First":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "Price Low to High":
        result.sort((a, b) => a.price - b.price);
        break;
      case "Price High to Low":
        result.sort((a, b) => b.price - a.price);
        break;
      case "Name A-Z":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "Name Z-A":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default: // Newest First
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return result;
  }, [items, searchQuery, filterCategories, filterStatus, priceMin, priceMax, sortBy]);

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1400px] px-8 py-8 pb-24">
        {/* Page Title & Actions */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Menu Management</h2>
            <p className="mt-1 text-sm text-neutral-500">Create, manage and organize your menu items easily.</p>
          </div>
          <div className="flex items-center gap-3">
             <div style={{ display: 'flex', gap: 8 }}>
               <button
                 onClick={() => setShowLibrary(true)}
                 style={{
                   padding: '10px 18px',
                   background: '#fff',
                   border: '1px solid #E8570C',
                   borderRadius: 8,
                   color: '#E8570C',
                   fontWeight: 500,
                   fontSize: 14,
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: 6,
                 }}
               >
                 📚 Browse Food Library
               </button>
               <button 
                 onClick={() => {
                   if (!restaurantId) {
                     toast.error("Please complete your workspace setup in Settings first.");
                     return;
                   }
                   if (activeTab === 'items') setIsAddModalOpen(true);
                   else setIsCategoryModalOpen(true);
                 }}
                 className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700"
               >
                 <Plus className="h-4 w-4" /> Add New {activeTab === 'items' ? 'Item' : 'Category'}
               </button>
             </div>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
             <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Total Items</p>
             <h4 className="mt-1 text-2xl font-bold text-neutral-900">{items.length}</h4>
          </div>
          <div className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
             <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Available</p>
             <h4 className="mt-1 text-2xl font-bold text-emerald-600">{items.filter((i: any) => i.is_available).length}</h4>
          </div>
          <div className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
             <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Out of Stock</p>
             <h4 className="mt-1 text-2xl font-bold text-rose-600">{items.filter((i: any) => !i.is_available).length}</h4>
          </div>
          <div className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
             <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Categories</p>
             <h4 className="mt-1 text-2xl font-bold text-blue-600">{menuCategories.length}</h4>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Tabs */}
          <div className="border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex px-6 pt-4 gap-8">
              <button 
                onClick={() => setActiveTab('items')}
                className={`pb-4 text-sm font-semibold transition-colors ${activeTab === 'items' ? 'border-b-2 border-brand-500 text-brand-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700'}`}
              >
                Menu Items
              </button>
              <button 
                onClick={() => setActiveTab('categories')}
                className={`pb-4 text-sm font-semibold transition-colors ${activeTab === 'categories' ? 'border-b-2 border-brand-500 text-brand-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700'}`}
              >
                Categories
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-b border-neutral-100">
            <div className="relative flex-1 sm:w-64 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`} 
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 shadow-sm"
              />
            </div>
            {activeTab === 'items' && (
              <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-50 shadow-sm transition-colors"
              >
                <Filter className="h-4 w-4" /> Filter Options
                {(filterCategories.length > 0 || filterStatus.length > 0 || priceMin || priceMax || sortBy !== 'Newest First') && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">!</span>
                )}
              </button>
            )}
          </div>

          {/* Content Lists */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 bg-neutral-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 w-48 bg-neutral-200 rounded"></div>
              </div>
            </div>
          ) : activeTab === 'items' ? (
            filteredItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState 
                  icon={MenuSquare}
                  title="No items found"
                  description={items.length === 0 ? "You haven't added any items yet." : "No items match your current filters."}
                  actionButton={
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-neutral-800"
                    >
                      <Plus className="h-4 w-4" /> Add First Item
                    </button>
                  }
                  className="w-full max-w-lg border-none bg-transparent"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-600">
                  <thead className="bg-neutral-50/50 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Item Name</th>
                      <th className="px-6 py-4 font-semibold">Category</th>
                      <th className="px-6 py-4 font-semibold">Price</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FoodImage
                              imageUrl={item.image_url}
                              imageSlug={nameToImageSlug(item.name)}
                              itemName={item.name}
                              size="sm"
                            />
                            <div className="max-w-[200px]">
                              <h4 className="font-semibold text-neutral-900 truncate">{item.name}</h4>
                              <p className="text-xs text-neutral-500 line-clamp-1">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-neutral-900">
                          ₹{item.price}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleMutation.mutate({ id: item.id, isAvailable: !item.is_available })}
                            disabled={toggleMutation.isPending}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                              item.is_available ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${item.is_available ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                            {item.is_available ? "Available" : "Out of Stock"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(item)}
                              className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this item?")) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="rounded-lg p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            menuCategories.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState 
                  icon={MenuSquare}
                  title="No categories found"
                  description="You haven't added any categories yet. Create categories to organize your menu items."
                  actionButton={
                    <button 
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-neutral-800"
                    >
                      <Plus className="h-4 w-4" /> Add Category
                    </button>
                  }
                  className="w-full max-w-lg border-none bg-transparent"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-600">
                  <thead className="bg-neutral-50/50 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Category Name</th>
                      <th className="px-6 py-4 font-semibold">Description</th>
                      <th className="px-6 py-4 font-semibold">Total Items</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {menuCategories
                      .filter((c: any) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((cat: any) => {
                      const itemCount = items.filter((i: any) => i.category === cat.name).length;
                      return (
                        <tr key={cat.id} className="hover:bg-neutral-50/60 transition-colors group">
                          <td className="px-6 py-4">
                            <h4 className="font-semibold text-neutral-900">{cat.icon} {cat.name}</h4>
                          </td>
                          <td className="px-6 py-4 text-xs text-neutral-500">
                            {cat.description || '-'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-neutral-900">
                            {itemCount}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleCategoryMut.mutate({ id: cat.id, isActive: !cat.is_active })}
                              disabled={toggleCategoryMut.isPending}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-50 ${
                                cat.is_active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${cat.is_active ? "bg-emerald-500" : "bg-neutral-400"}`}></span>
                              {cat.is_active ? "Active" : "Hidden"}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditCategory(cat)}
                                className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-brand-600"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this category?")) {
                                    deleteCategoryMut.mutate(cat.id);
                                  }
                                }}
                                disabled={deleteCategoryMut.isPending}
                                className="rounded-lg p-2 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* FILTER DRAWER / MODAL */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-end bg-neutral-900/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Filter Options</h3>
              <button onClick={() => setIsFilterOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Category Filter */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3">Category</h4>
                <div className="space-y-2">
                  {menuCategories.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={filterCategories.includes(c.name)}
                        onChange={(e) => {
                          if (e.target.checked) setFilterCategories([...filterCategories, c.name]);
                          else setFilterCategories(filterCategories.filter(name => name !== c.name));
                        }}
                        className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-sm text-neutral-600 group-hover:text-neutral-900">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3">Status</h4>
                <div className="space-y-2">
                  {['Available', 'Out of Stock'].map((status) => (
                    <label key={status} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={filterStatus.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) setFilterStatus([...filterStatus, status]);
                          else setFilterStatus(filterStatus.filter(s => s !== status));
                        }}
                        className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-sm text-neutral-600 group-hover:text-neutral-900">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3">Price Range</h4>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" placeholder="Min" 
                    value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-brand-500" 
                  />
                  <span className="text-neutral-400">-</span>
                  <input 
                    type="number" placeholder="Max" 
                    value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-brand-500" 
                  />
                </div>
              </div>

              {/* Sort By */}
              <div>
                <h4 className="text-sm font-bold text-neutral-900 mb-3">Sort By</h4>
                <select 
                  value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm outline-none focus:border-brand-500 bg-white"
                >
                  <option>Newest First</option>
                  <option>Oldest First</option>
                  <option>Price Low to High</option>
                  <option>Price High to Low</option>
                  <option>Name A-Z</option>
                  <option>Name Z-A</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
              <button 
                onClick={clearFilters}
                className="text-sm font-medium text-neutral-500 hover:text-neutral-900"
              >
                Reset Filter
              </button>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit CATEGORY Modal */}
      {(isCategoryModalOpen || editingCategoryId) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">{editingCategoryId ? 'Edit Category' : 'Create Category'}</h3>
              <button 
                onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryId(null); setCategoryForm({ name: '', description: '', icon: '' }); }} 
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category Name</label>
                <input value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} type="text" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="e.g. Burgers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description (Optional)</label>
                <textarea value={categoryForm.description} onChange={e => setCategoryForm({...categoryForm, description: e.target.value})} rows={2} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="Delicious hot burgers..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category Icon (Emoji/Text - Optional)</label>
                <input value={categoryForm.icon} onChange={e => setCategoryForm({...categoryForm, icon: e.target.value})} type="text" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="🍔" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryId(null); setCategoryForm({ name: '', description: '', icon: '' }); }} 
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCategory} 
                disabled={addCategoryMut.isPending || editCategoryMut.isPending}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
              >
                {editingCategoryId ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit ITEM Modal */}
      {(isAddModalOpen || editingItemId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">{editingItemId ? 'Edit Item' : 'Add New Item'}</h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingItemId(null); setFormData({ name: '', description: '', price: '', category: '' }); }} 
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                {editingItemId && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                      Item Photo
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FoodImage
                        imageUrl={items.find((i: any) => i.id === editingItemId)?.image_url}
                        imageSlug={nameToImageSlug(formData.name)}
                        itemName={formData.name || 'Item'}
                        size="md"
                      />
                      <div>
                        <label style={{
                          display: 'inline-block',
                          padding: '6px 14px',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: 'pointer',
                          color: '#374151',
                        }}>
                          {isUploading ? 'Uploading...' : 'Change photo'}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              setIsUploading(true)
                              const fd = new FormData()
                              fd.append('image', file)
                              const result = await uploadMenuItemImage(editingItemId, fd)
                              if (result.success) {
                                queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
                                toast.success('Photo updated')
                              } else {
                                toast.error(result.error)
                              }
                              setIsUploading(false)
                            }}
                          />
                        </label>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          PNG or JPG, max 1MB
                        </div>
                        {items.find((i: any) => i.id === editingItemId)?.image_url && (
                          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>
                            ✓ Custom photo uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Item Name</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="e.g. Classic Cheeseburger" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="Brief description of the item..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Price (₹)</label>
                    <input value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} type="number" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                    {menuCategories.length > 0 ? (
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none bg-white"
                      >
                        <option value="">Select Category</option>
                        {menuCategories.map((c: any) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        type="text" 
                        className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none bg-white" 
                        placeholder="Create a category first..." 
                        disabled
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingItemId(null); setFormData({ name: '', description: '', price: '', category: '' }); }} 
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveItem} 
                disabled={addMutation.isPending || editMutation.isPending}
                className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
              >
                {editingItemId ? 'Save Changes' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLibrary && restaurantId && (
        <FoodLibraryPicker
          restaurantId={restaurantId}
          onItemsAdded={(count) => {
            toast.success(`${count} item${count > 1 ? 's' : ''} added to your menu`);
            queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
          }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </OwnerLayout>
  );
}
