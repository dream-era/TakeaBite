"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { User, Building2, BellRing, ShieldCheck, CreditCard, Save, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { updateRestaurantProfile } from "@/actions/restaurant";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'business' | 'account' | 'notifications' | 'support'>('business');
  const { owner, restaurant, updateRestaurant } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (restaurant) {
      setShopName(restaurant.name || "");
      setPhone(restaurant.phone || "");
      setAddress(restaurant.address || "");
      setEmail(restaurant.contact_email || owner?.email || "");
      setLogoPreview(restaurant.logo_url || null);
    }
  }, [restaurant, owner]);

  const handleSaveBusiness = async () => {
    setIsSaving(true);
    try {
      if (!restaurant?.id) {
        // Create new restaurant profile instead of returning
        const { createRestaurant } = await import("@/actions/restaurant");
        const createResult = await createRestaurant({
          name: shopName || "My Workspace",
          type: "restaurant",
          phone: phone || undefined,
          address: address || undefined,
        });
        
        if (!createResult.success) {
          toast.error("Failed to create workspace: " + createResult.error);
          setIsSaving(false);
          return;
        }
        
        const newRestaurant = createResult.data;
        let finalLogoUrl = newRestaurant.logo_url;
        
        // If a logo was selected, upload it
        if (logoFile) {
          const formData = new FormData();
          formData.append('logo', logoFile);
          const { uploadRestaurantLogo, updateRestaurantProfile } = await import("@/actions/restaurant");
          const uploadResult = await uploadRestaurantLogo(newRestaurant.id, formData);
          if (uploadResult.success) {
            finalLogoUrl = uploadResult.data.logoUrl;
            // update profile with logo and email
            await updateRestaurantProfile({
               restaurantId: newRestaurant.id,
               name: shopName || "My Workspace",
               contactEmail: email,
               phone: phone,
               address: address,
            });
          }
        }
        
        toast.success("Workspace created successfully!");
        window.location.reload();
        return;
      }

      let finalLogoUrl = restaurant.logo_url;
      
      // If a new logo was selected, upload it first
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        const { uploadRestaurantLogo } = await import("@/actions/restaurant");
        const uploadResult = await uploadRestaurantLogo(restaurant.id, formData);
        if (!uploadResult.success) {
          toast.error("Failed to upload logo: " + uploadResult.error);
          setIsSaving(false);
          return;
        }
        finalLogoUrl = uploadResult.data.logoUrl;
      }

      const result = await updateRestaurantProfile({
        restaurantId: restaurant.id,
        name: shopName,
        phone: phone,
        contactEmail: email,
        address: address,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // Update local state with the new logo URL if changed
      const updatedData = { ...result.data };
      if (finalLogoUrl && finalLogoUrl !== updatedData.logo_url) {
         updatedData.logo_url = finalLogoUrl;
      }

      updateRestaurant(updatedData);
      if (result.data.slugChanged) {
        toast.success("Business profile saved! Note: QR codes might need to be regenerated due to name change.");
      } else {
        toast.success("Business profile saved!");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1000px] px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Settings</h2>
          <p className="mt-1 text-sm text-neutral-500">Manage your workspace preferences and account details.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Settings Navigation */}
          <div className="w-full md:w-64 shrink-0 space-y-1">
            <button 
              onClick={() => setActiveTab('business')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'business' ? 'bg-white text-brand-600 shadow-sm border border-neutral-200/60' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <Building2 className="h-5 w-5" /> Business Profile
            </button>
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'account' ? 'bg-white text-brand-600 shadow-sm border border-neutral-200/60' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <User className="h-5 w-5" /> Personal Account
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'notifications' ? 'bg-white text-brand-600 shadow-sm border border-neutral-200/60' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              <BellRing className="h-5 w-5" /> Notifications
            </button>
            <div className="pt-4 mt-4 border-t border-neutral-200">
              <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-neutral-600 rounded-xl hover:bg-neutral-100 transition-colors">
                <ShieldCheck className="h-5 w-5" /> Security
              </button>
              <Link href="/pricing" className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-neutral-600 rounded-xl hover:bg-neutral-100 transition-colors">
                <CreditCard className="h-5 w-5" /> Billing & Plan
              </Link>
              <button 
                onClick={() => setActiveTab('support')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-colors ${activeTab === 'support' ? 'bg-white text-brand-600 shadow-sm border border-neutral-200/60' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                <MessageSquare className="h-5 w-5" /> Complaints & Support
              </button>
            </div>
          </div>

          {/* Settings Content Area */}
          <div className="flex-1 bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
            {activeTab === 'business' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Business Profile</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-6">
                    <div className="relative h-24 w-24 rounded-2xl bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors overflow-hidden">
                      <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleLogoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-neutral-500">Upload Logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Business Name</label>
                      <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="Enter your business name" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="contact@business.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="+91 98765 43210" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Address</label>
                    <textarea rows={3} value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="Enter full address..."></textarea>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button onClick={handleSaveBusiness} disabled={isSaving} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
                      <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Personal Account</h3>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                      <input type="email" value={owner?.email || ''} disabled className="w-full border border-neutral-200 bg-neutral-50 text-neutral-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" />
                    </div>
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <button type="button" disabled className="flex items-center gap-2 bg-brand-600 opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
                      <Save className="h-4 w-4" /> Update Profile
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Notification Preferences</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-900 text-sm">New Order Alerts</h4>
                      <p className="text-xs text-neutral-500">Receive push notifications when a new order arrives.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-900 text-sm">Daily Summary Email</h4>
                      <p className="text-xs text-neutral-500">Receive a daily report of your shop&apos;s performance.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-bold text-neutral-900 mb-6">Complaints & Support</h3>
                <div className="flex flex-col items-center justify-center text-center p-8 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100 mb-4">
                    <MessageSquare className="h-8 w-8 text-brand-600" />
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900 mb-2">Need Help?</h4>
                  <p className="text-sm text-neutral-600 mb-6 max-w-sm">
                    Hi, how can we help? <br />
                    From product support to career opportunities, we&apos;ve got you covered.
                  </p>
                  
                  <button 
                    onClick={() => {
                      const SUPPORT_LINK = "#";
                      window.open(SUPPORT_LINK, "_blank");
                    }}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold transition-colors w-full md:w-auto mb-6 shadow-sm"
                  >
                    Open Complaint Box
                  </button>

                  <div className="w-full border-t border-neutral-200 pt-6 mt-2">
                    <div className="flex flex-col md:flex-row justify-center gap-8 text-center md:text-center">
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Support Hours</p>
                        <p className="text-sm font-semibold text-neutral-900">Mon - Sat<br/>9:00 AM - 6:00 PM</p>
                      </div>
                      <div className="hidden md:block w-px bg-neutral-200"></div>
                      <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Response Time</p>
                        <p className="text-sm font-semibold text-neutral-900">Usually within 24 hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </OwnerLayout>
  );
}
