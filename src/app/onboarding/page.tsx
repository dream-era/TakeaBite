/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { createRestaurant } from "@/actions/restaurant";
import { useAuthStore } from "@/store/authStore";
import { Flame, Utensils,
  LayoutDashboard,
  ClipboardList,
  MenuSquare,
  Users,
  QrCode,
  CreditCard,
  BarChart3,
  UsersRound,
  Bell,
  Settings,
  Search,
  ChevronDown,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Info } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("This feature will be launched soon!");
  };

  const [shopName, setShopName] = useState("");
  const { user, updateRestaurant } = useAuthStore();
  const userName = user?.email ? user.email.split('@')[0] : "Owner";

  useEffect(() => {
    // We don't need localStorage anymore since we rely on the authStore
  }, []);
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const pathname = usePathname();

  const sidebarMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
    { icon: MenuSquare, label: "Menu Management", href: "/menu-management" },
    { icon: Users, label: "Staff Workspace", href: "/staff-management" },
    { icon: QrCode, label: "QR & Tables", href: "/qr-generation" },
    { icon: CreditCard, label: "Payments", href: "/payments" },
    { icon: BarChart3, label: "Analytics", href: "#", locked: true },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const handleSaveAndContinue = async () => {
    if (!shopName || !category || !phone || !address) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRestaurant({
        name: shopName,
        type: category,
        phone: phone,
        address: address,
        city: "", // Can be extended
        description: "",
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      
      updateRestaurant(result.data);
      toast.success("Shop details saved!");
      
      // Auto-generate Universal QR code in the background
      fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: result.data.id, mode: 'universal' })
      }).catch(err => console.error("Failed to generate Universal QR in background:", err));

      router.push("/menu-management");
    } catch (err: any) {
      console.error("Client error:", err);
      toast.error(`Failed to save shop details: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Shop Details", active: true },
    { number: 2, title: "Menu Setup" },
    { number: 3, title: "Business Settings" },
    { number: 4, title: "QR Generation" },
    { number: 5, title: "You're All Set" },
  ];

  // premiumFeatures unused

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur-md lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex h-20 items-center px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-neutral-900">
              TakeaBite
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          {sidebarMenuItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "#" && pathname?.startsWith(item.href + '/'));
            return (
              <Link onClick={item.locked ? handleLockedClick : undefined} href={item.href || "#"}
                key={index}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-50 text-brand-600 shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-neutral-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Premium Upgrade Card */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-brand-600 to-brand-700 p-5 shadow-[0_8px_20px_rgba(229,9,20,0.3)]">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-400/30 blur-xl"></div>
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-brand-400/30 blur-xl"></div>
            
            <div className="relative z-10">
              <div className="mb-1 flex items-center gap-2 text-yellow-300">
                <Flame className="h-4 w-4" />
              </div>
              <h4 className="mb-2 font-bold text-white leading-tight text-sm">Upgrade Your Plan</h4>
              <p className="mb-4 text-xs text-brand-100 leading-tight">Unlock more features and grow your business faster.</p>
              <Link href="/pricing" className="flex w-full justify-center items-center rounded-full bg-white py-2.5 text-xs font-bold text-brand-600 shadow-sm transition-all hover:scale-[1.02]">
                Upgrade Now
              </Link>
            </div>
            
            <div className="absolute -bottom-2 -right-2 text-5xl opacity-90 drop-shadow-lg transform -rotate-12">
              🚀
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-neutral-200/60 bg-[#F5F5F1]/80 px-8 backdrop-blur-md">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Welcome, {userName}! 👋</h1>
            <p className="text-sm text-neutral-500">Let’s set up your digital shop in a few simple steps.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900">
              <Search className="h-4 w-4" />
            </button>
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-neutral-200">
              <img src="https://i.pravatar.cc/150?u=amit" alt="Profile" className="h-full w-full object-cover" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto w-full max-w-6xl px-8 py-8 pb-24">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900">Create Your Digital Shop</h2>
            <p className="mt-2 text-neutral-500">Set up your shop and start receiving orders in minutes.</p>
          </div>

          {/* Stepper */}
          <div className="mb-10 w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex min-w-max items-center">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                      step.active 
                        ? "border-brand-500 bg-brand-50 text-brand-600" 
                        : "border-neutral-200 bg-white text-neutral-400"
                    }`}>
                      {step.active ? step.number : <CheckCircle2 className="h-5 w-5 opacity-50" />}
                    </div>
                    <span className={`text-sm font-medium ${step.active ? "text-neutral-900" : "text-neutral-400"}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-4 h-[2px] w-12 bg-neutral-200"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* ── Form Column ── */}
            <div className="col-span-full">
              <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-neutral-900">Shop Details</h3>
                  <p className="text-sm text-neutral-500">Tell us about your business.</p>
                </div>

                <div className="space-y-6">
                  {/* Shop Name & Category */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Shop Name</label>
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="e.g. The Coffee House"
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Business Category</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          list="category-options"
                          placeholder="Type or select a category"
                          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                        />
                        <datalist id="category-options">
                          <option value="Restaurant" />
                          <option value="Cafe" />
                          <option value="Juice Shop" />
                          <option value="Bakery" />
                          <option value="Retail Store" />
                          <option value="Salon" />
                          <option value="Other" />
                        </datalist>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Phone Number</label>
                    <div className="flex">
                      <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-neutral-200 bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-600">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        className="w-full rounded-r-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Business Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter full shop address..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    ></textarea>
                  </div>

                  {/* File Uploads */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-700">Shop Logo</label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-6 transition-all hover:border-brand-400 hover:bg-brand-50/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                          {logoFile ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <UploadCloud className="h-5 w-5 text-brand-500" />}
                        </div>
                        <span className="text-xs font-medium text-neutral-600 text-center px-4 truncate w-full">
                          {logoFile ? logoFile.name : "Click to upload logo"}
                        </span>
                        <span className="text-[10px] text-neutral-400">JPG, PNG (Max 2MB)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
                        }} />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between text-sm font-medium text-neutral-700">
                        <span>Shop Banner</span>
                        <span className="text-xs text-neutral-400 font-normal">Optional</span>
                      </label>
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-6 transition-all hover:border-brand-400 hover:bg-brand-50/50">
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                          {bannerFile ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <UploadCloud className="h-5 w-5 text-brand-500" />}
                        </div>
                        <span className="text-xs font-medium text-neutral-600 text-center px-4 truncate w-full">
                          {bannerFile ? bannerFile.name : "Upload banner image"}
                        </span>
                        <span className="text-[10px] text-neutral-400">1200x400px recommended</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setBannerFile(e.target.files[0]);
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* Bottom Action Area */}
          <div className="mt-8 flex flex-col items-center justify-between gap-6 rounded-2xl bg-white p-6 shadow-sm border border-neutral-100 sm:flex-row">
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Info className="h-4 w-4" />
              </div>
              <p>Don&apos;t worry — you can customize everything later from <span className="font-semibold text-neutral-900">Settings</span>.</p>
            </div>
            <button 
              onClick={handleSaveAndContinue}
              disabled={isSubmitting}
              className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(229,9,20,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-4px_rgba(229,9,20,0.6)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting ? "Saving..." : "Save & Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
