/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { saveBusinessSetup } from "@/actions/restaurant";
import { Lock, Utensils, LayoutDashboard, ClipboardList, MenuSquare, Users, QrCode,
  CreditCard, BarChart3, UsersRound, Bell, Settings, Sparkles, Search,
  ChevronDown, ArrowRight, ArrowLeft, CheckCircle2, Clock, Store,
  Info } from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export default function BusinessSetupPage() {
  const router = useRouter();
  const { user, restaurant, setRestaurant } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast("This feature will be launched soon!", { icon: "🚀" });
  };

  const [businessType, setBusinessType] = useState<"individual" | "proprietorship" | "partnership" | "private_limited">("individual");
  const [gstNumber, setGstNumber] = useState("");
  const [cuisineType, setCuisineType] = useState("multi");
  const [timezone, setTimezone] = useState("asia_kolkata");
  const [currency, setCurrency] = useState("inr");
  const [operatingDays, setOperatingDays] = useState("all");
  const [taxType, setTaxType] = useState("gst");
  const [taxRate, setTaxRate] = useState("5");

  useEffect(() => {
    if (restaurant) {
      if (restaurant.business_type) setBusinessType(restaurant.business_type as "individual" | "proprietorship" | "partnership" | "private_limited");
      if (restaurant.gst_number) setGstNumber(restaurant.gst_number);
    }
  }, [restaurant]);

  const sidebarMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: MenuSquare, label: "Menu Management", href: "/menu-management" },
    { icon: Users, label: "Staff Workspace", href: "/staff-management" },
    { icon: QrCode, label: "QR & Tables", href: "/qr-generation" },
    { icon: CreditCard, label: "Payments", href: "/payments" },
    { icon: BarChart3, label: "Analytics", href: "#", locked: true },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const steps = [
    { num: 1, label: "Shop Details", href: "/onboarding", active: false },
    { num: 2, label: "Menu Setup", href: "/menu-management", active: false },
    { num: 3, label: "Business Setup", href: "/business-setup", active: true },
    { num: 4, label: "QR Generation", href: "/qr-generation", active: false },
    { num: 5, label: "You're All Set", href: "/all-set", active: false },
  ];

  const handleSaveAndContinue = async () => {
    if (!restaurant?.id) {
      toast.error("No active workspace found");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveBusinessSetup({
        restaurantId: restaurant.id,
        businessType: businessType as "individual" | "proprietorship" | "partnership" | "private_limited",
        gstNumber: gstNumber || undefined,
        workingHours: {
          open: "09:00",
          close: "23:00",
          days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        }
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      
      setRestaurant(result.data);
      toast.success("Business details saved!");
      router.push("/qr-generation");
    } catch {
      toast.error("Failed to save business details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur-md lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="flex h-20 items-center px-6">
          <Link href="/" className="group">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {sidebarMenuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href || "#"}
              onClick={item.locked ? handleLockedClick : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                item.active
                  ? "bg-brand-50 text-brand-600 shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${item.active ? "text-brand-600" : "text-neutral-400"}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.locked && (
                  <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-1" />
              )}
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-5 shadow-lg">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2 text-brand-400">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Pro Plan</span>
              </div>
              <h4 className="mb-1 font-semibold text-white">Upgrade Your Plan</h4>
              <p className="mb-3 text-xs text-neutral-300">Unlock more features and grow your business faster.</p>
              <button className="w-full rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 py-2 text-xs font-semibold text-white shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all hover:scale-[1.02]">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-y-auto relative">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-neutral-200/60 bg-white/80 px-4 md:px-8 backdrop-blur-md shadow-sm gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 border border-neutral-200 shadow-inner overflow-hidden">
              <img src={restaurant?.logo_url || `https://ui-avatars.com/api/?name=${restaurant?.name || 'Shop'}&background=fef2f2&color=ef4444&size=40`} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex cursor-pointer items-center gap-2 rounded-lg py-1 px-2 hover:bg-neutral-50 transition-colors min-w-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900 leading-tight truncate">{restaurant?.name || 'Your Shop'}</h3>
                <p className="text-[10px] font-medium text-brand-600 uppercase tracking-wide truncate">Main Branch</p>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">

            <button className="hidden md:flex relative h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm hover:text-neutral-900">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer rounded-full border border-neutral-200 bg-white p-1 md:py-1.5 md:pl-1.5 md:pr-4 shadow-sm hover:bg-neutral-50 shrink-0">
              <div className="h-7 w-7 overflow-hidden rounded-full border border-neutral-100 shrink-0">
                <img src={`https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'User'}&background=fef2f2&color=ef4444`} alt="" className="h-full w-full object-cover" />
              </div>
              <span className="hidden md:block text-sm font-medium text-neutral-700 truncate max-w-[100px]">{user?.email?.split('@')[0] || 'Owner'}</span>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-neutral-400" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="mx-auto w-full max-w-[1400px] px-8 py-8 pb-24">
          {/* Title */}
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Create Your Digital Shop</h2>
          <p className="mt-1 text-sm text-neutral-500 mb-8">Set up your shop and start receiving orders in minutes.</p>

          {/* Stepper */}
          <div className="mb-8 w-full overflow-x-auto pb-2">
            <div className="flex min-w-max items-center">
              {steps.map((step, idx) => (
                <React.Fragment key={step.num}>
                  <Link href={step.href} className="flex items-center gap-2.5 group">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-sm transition-all ${
                      step.active
                        ? "border-brand-500 bg-brand-50 text-brand-600 shadow-[0_0_0_4px_rgba(229,9,20,0.08)]"
                        : "border-neutral-200 bg-white text-neutral-400"
                    }`}>
                      {step.active ? step.num : <CheckCircle2 className="h-4 w-4 opacity-50" />}
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap transition-colors ${
                      step.active ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
                    }`}>
                      {step.label}
                    </span>
                  </Link>
                  {idx < steps.length - 1 && <div className="mx-4 h-px w-10 shrink-0 bg-neutral-200" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
            {/* Form */}
            <div className="xl:col-span-8">
              <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-bold text-neutral-900 mb-1">Business Essentials</h3>
                <p className="text-sm text-neutral-500 mb-6">Provide essential details to configure your business operations.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Business Type */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Business Type</label>
                    <select value={businessType} onChange={e => setBusinessType(e.target.value as "individual" | "proprietorship" | "partnership" | "private_limited")} className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 appearance-none">
                      <option value="individual">Individual / Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="private_limited">Private Limited</option>
                    </select>
                  </div>
                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 appearance-none">
                      <option value="inr">INR (₹)</option>
                      <option value="usd">USD ($)</option>
                    </select>
                  </div>
                  {/* Cuisine Type */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Cuisine Type</label>
                    <select value={cuisineType} onChange={e => setCuisineType(e.target.value)} className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 appearance-none">
                      <option value="italian">Italian</option>
                      <option value="indian">Indian</option>
                      <option value="chinese">Chinese</option>
                      <option value="mexican">Mexican</option>
                      <option value="japanese">Japanese</option>
                      <option value="multi">Multi-cuisine</option>
                    </select>
                  </div>
                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Primary Contact Number</label>
                    <div className="flex gap-2">
                      <select className="h-12 w-20 rounded-xl border border-neutral-200 bg-white px-2 text-sm focus:border-brand-400 focus:outline-none appearance-none text-center">
                        <option>+91</option><option>+1</option><option>+44</option>
                      </select>
                      <input type="tel" placeholder="98765 43210" defaultValue={restaurant?.phone || ''} disabled
                        className="flex-1 h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm focus:outline-none text-neutral-500" />
                    </div>
                  </div>
                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Time Zone</label>
                    <select value={timezone} onChange={e => setTimezone(e.target.value)} className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 appearance-none">
                      <option value="asia_kolkata">(GMT +05:30) Asia/Kolkata</option>
                      <option value="us_eastern">(GMT -05:00) US/Eastern</option>
                      <option value="europe_london">(GMT +00:00) Europe/London</option>
                    </select>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">Email Address</label>
                    <input type="email" placeholder="mario.pizza@gmail.com" defaultValue={user?.email || ''} disabled
                      className="w-full h-12 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm focus:outline-none text-neutral-500" />
                  </div>
                </div>

                {/* Operating Days */}
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">Operating Days</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="opDays" checked={operatingDays === "all"} onChange={() => setOperatingDays("all")} className="w-4 h-4 text-brand-600 accent-brand-600" />
                      <span className="text-sm font-medium text-neutral-700">Open All Days</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="opDays" checked={operatingDays === "custom"} onChange={() => setOperatingDays("custom")} className="w-4 h-4 text-brand-600 accent-brand-600" />
                      <span className="text-sm font-medium text-neutral-700">Custom Days</span>
                    </label>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">You can manage weekly timings and special hours after onboarding from Business Settings.</p>
                  </div>
                </div>

                {/* Tax Information */}
                <div className="mt-6 pt-6 border-t border-neutral-100">
                  <h4 className="text-lg font-bold text-neutral-900 mb-4">Tax Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Tax Type</label>
                      <select value={taxType} onChange={e => setTaxType(e.target.value)} className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50 appearance-none">
                        <option value="gst">GST</option>
                        <option value="none">No Tax</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">GST Number <span className="text-neutral-400 font-normal">(Optional)</span></label>
                      <input type="text" placeholder="22AAAAA0000A1Z5" value={gstNumber} onChange={e => setGstNumber(e.target.value)}
                        className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-2">Default Tax Rate (%)</label>
                      <div className="relative">
                        <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)}
                          className="w-full h-12 rounded-xl border border-neutral-200 bg-white px-4 pr-10 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-50" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100">
                  <Link href="/menu-management" className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Previous
                  </Link>
                  <button 
                    onClick={handleSaveAndContinue}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3 text-sm font-bold text-white shadow-[0_4px_14px_-2px_rgba(229,9,20,0.4)] transition-all hover:scale-[1.02] disabled:opacity-50">
                    {isSubmitting ? "Saving..." : "Save & Continue"} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Preview Column */}
            <div className="xl:col-span-4 flex flex-col gap-6">


              {/* Business Summary */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-neutral-900">Business Summary</h4>
                  <button className="text-xs font-semibold text-brand-600 hover:text-brand-700">Edit</button>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { icon: Store, label: "Shop Name", value: restaurant?.name || "Your Shop" },
                    { icon: Utensils, label: "Business Type", value: businessType.charAt(0).toUpperCase() + businessType.slice(1) },
                    { icon: Utensils, label: "Cuisine", value: cuisineType.charAt(0).toUpperCase() + cuisineType.slice(1) },
                    { icon: Clock, label: "Timings", value: "09:00 AM - 11:00 PM" },
                    { icon: CheckCircle2, label: "Operating Days", value: operatingDays === "all" ? "Open All Days" : "Custom" },
                    { icon: CreditCard, label: "Tax", value: `${taxType.toUpperCase()} ${taxRate}%` },
                    { icon: CreditCard, label: "Currency", value: currency === "inr" ? "INR (₹)" : currency.toUpperCase() },
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                      <row.icon className="h-4 w-4 text-neutral-400 shrink-0" />
                      <span className="text-neutral-500 w-28 shrink-0">{row.label}</span>
                      <span className="font-medium text-neutral-900">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
