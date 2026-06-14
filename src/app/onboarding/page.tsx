/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "react-hot-toast";
import { createRestaurant, completeOnboarding } from "@/actions/restaurant";
import { useAuthStore } from "@/store/authStore";
import { Flame,
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
  ArrowLeft,
  Info,
  Save} from "lucide-react";
import { Logo } from "@/components/shared/Logo";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast("This feature will be launched soon!", { icon: "🚀" });
  };

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [tableCount, setTableCount] = useState<number | "">("");
  const { user, updateRestaurant, restaurant } = useAuthStore();
  const userName = user?.email ? user.email.split('@')[0] : "Owner";

  useEffect(() => {
    // Resume onboarding logic
    if (restaurant && !restaurant.onboarding_complete) {
       // if restaurant exists, we can skip step 1
       setCurrentStep(2);
    }
  }, [restaurant]);

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

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully!");
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!shopName || !category || !phone || !address || !tableCount) {
        toast.error("Please fill in all required fields including Table Count.");
        return;
      }

      setIsSubmitting(true);
      try {
        // Only create if we haven't already
        if (!restaurant) {
          const result = await createRestaurant({
            name: shopName,
            type: category,
            phone: phone,
            address: address,
            city: "",
            description: "",
            tableCount: Number(tableCount),
          });

          if (!result.success) {
            toast.error(result.error);
            return;
          }
          
          updateRestaurant(result.data);
          
          fetch('/api/generate-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId: result.data.id, mode: 'universal' })
          }).catch(err => console.error("Failed to generate Universal QR in background:", err));
        }
        
        toast.success("Shop details saved!");
        setCurrentStep(2);
      } catch (err: any) {
        console.error("Client error:", err);
        toast.error(`Failed to save shop details: ${err?.message || "Unknown error"}`);
      } finally {
        setIsSubmitting(false);
      }
    } else if (currentStep === 2) {
      if (!restaurant) return;
      setIsSubmitting(true);
      try {
        const res = await completeOnboarding(restaurant.id);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Onboarding complete!");
        router.push("/dashboard");
      } catch (e) {
        toast.error("Failed to complete onboarding.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const steps = [
    { number: 1, title: "Shop Details" },
    { number: 2, title: "Review & Launch" },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur-md lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex h-20 items-center px-6">
          <Link href="/" className="group">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
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
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-neutral-200/60 bg-[#F5F5F1]/80 px-4 md:px-8 backdrop-blur-md gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-neutral-900 truncate">Welcome, {userName}! 👋</h1>
            <p className="text-sm text-neutral-500 truncate hidden md:block">Let’s set up your digital shop in a few simple steps.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Hidden on mobile to prevent overlap, dummy buttons anyway */}
            <button className="hidden md:flex relative h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
            </button>
            <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-neutral-200 bg-brand-50 flex items-center justify-center text-brand-600 font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto w-full max-w-6xl px-8 py-8 pb-24">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900">Create Your Digital Shop</h2>
              <p className="mt-2 text-neutral-500">Set up your shop and start receiving orders in minutes.</p>
            </div>
            <button 
              onClick={handleSaveDraft}
              className="flex items-center gap-2 rounded-lg bg-white border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <Save className="h-4 w-4" /> Save Draft
            </button>
          </div>

          {/* Stepper with Progress Bar */}
          <div className="mb-10 w-full">
            <div className="flex items-center justify-between relative mb-4">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-200 -z-10 rounded-full transform -translate-y-1/2"></div>
              <div 
                className="absolute top-1/2 left-0 h-1 bg-brand-500 -z-10 rounded-full transform -translate-y-1/2 transition-all duration-300" 
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              ></div>
              
              {steps.map((step) => {
                const isActive = step.number === currentStep;
                const isCompleted = step.number < currentStep;
                
                return (
                  <div key={step.number} className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors bg-white ${
                      isActive 
                        ? "border-brand-500 text-brand-600 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]" 
                        : isCompleted
                        ? "border-brand-500 text-brand-500"
                        : "border-neutral-200 text-neutral-400"
                    }`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5 text-brand-500" /> : step.number}
                    </div>
                    <span className={`text-xs mt-2 font-medium absolute -bottom-6 w-24 text-center transform -translate-x-1/2 left-1/2 ${isActive ? "text-neutral-900" : "text-neutral-400"}`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 mt-12">
            {/* ── Form Column ── */}
            <div className="col-span-full">
              <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] min-h-[400px]">
                
                {currentStep === 1 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-neutral-900">Shop Details</h3>
                      <p className="text-sm text-neutral-500">Tell us about your business.</p>
                    </div>

                    <div className="space-y-6">
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
                          <label className="text-sm font-medium text-neutral-700">Owner Name</label>
                          <input
                            type="text"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      </div>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-neutral-700">Table Count</label>
                          <input
                            type="number"
                            value={tableCount}
                            onChange={(e) => setTableCount(parseInt(e.target.value) || "")}
                            placeholder="e.g. 20"
                            min="1"
                            max="100"
                            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                          />
                          <p className="text-xs text-neutral-500 mt-1">We will automatically generate tables based on this count.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-500 py-16">
                    <div className="h-24 w-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-12 w-12" />
                    </div>
                    <h3 className="text-3xl font-bold text-neutral-900 mb-2">You&apos;re All Set!</h3>
                    <p className="text-neutral-500 max-w-md mb-8">
                      Your restaurant has been created along with {tableCount || 'your'} tables. You can now access your dashboard and start accepting orders.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-neutral-100 sm:flex-row">
            <button 
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className={`flex items-center gap-2 rounded-xl border border-neutral-200 px-6 py-3.5 text-sm font-bold text-neutral-600 transition-colors ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'hover:bg-neutral-50'}`}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            
            <div className="flex items-center gap-3 text-sm text-neutral-600 hidden md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <Info className="h-4 w-4" />
              </div>
              <p>You can customize everything later from <span className="font-semibold text-neutral-900">Settings</span>.</p>
            </div>
            
            <button 
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(229,9,20,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-4px_rgba(229,9,20,0.6)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSubmitting 
                ? (currentStep === 2 ? "Launching..." : "Saving...") 
                : (currentStep === 2 ? "Launch Dashboard" : "Save & Continue")}
              {currentStep < 2 && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
