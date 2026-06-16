"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Utensils, LayoutDashboard, MenuSquare, Users, QrCode,
  CreditCard, BarChart3, Bell, Settings, ChevronDown, Flame, Search, Menu, X, LogOut
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { useUIStore } from "@/lib/store/ui-store";
import { useAuthStore, useRestaurantProfile, useOwnerProfile, usePlan } from "@/store/authStore";

interface OwnerLayoutProps {
  children: React.ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, setSidebarOpen } = useUIStore();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { initialize, logout } = useAuthStore();
  const profile = useRestaurantProfile();
  const owner = useOwnerProfile();
  const { plan, subStatus, isTrialExpired, trialDaysRemaining } = usePlan();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Close sidebar on path change on mobile
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const userName = owner?.fullName || "Owner";
  const shopName = profile?.name || "Setup Pending";

  const sidebarMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: MenuSquare, label: "Menu Management", href: "/menu-management" },
    { icon: Users, label: "Staff Workspace", href: "/staff-management" },
    { icon: QrCode, label: "QR & Tables", href: "/qr-generation" },
    { icon: CreditCard, label: "Payments", href: "/payments" },
    { icon: BarChart3, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error(err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-neutral-200 bg-white/95 backdrop-blur-md shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300 lg:static lg:flex lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'
      }`}>
        <div className="flex h-20 shrink-0 items-center justify-between px-6">
          <Link href="/" className="group">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <button 
            className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          {sidebarMenuItems.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-brand-50 text-brand-600 shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-neutral-400"}`} />
                <span className="flex-1 text-left">{item.label}</span>
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
              <h4 className="mb-2 font-bold text-white leading-tight text-sm capitalize">
                {plan} Plan Active
              </h4>
              <p className="mb-4 text-xs text-brand-100 leading-tight">
                {subStatus === 'trial' 
                  ? `Growth Trial - ${trialDaysRemaining} Days Remaining` 
                  : (plan === 'pro' || plan === 'growth' ? "You have access to premium features." : "Upgrade to Growth for more features.")}
              </p>
              <Link href="/pricing" className="flex w-full justify-center items-center rounded-full bg-white/20 hover:bg-white/30 py-2.5 text-xs font-bold text-white shadow-sm transition-all">
                Manage Billing
              </Link>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-neutral-100 mt-auto">
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />
            <span className="flex-1 text-left">{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex flex-1 flex-col overflow-y-auto relative">
        {/* Soft Background Gradient at the top */}
        <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-[#FDF0E1] to-[#F5F5F1] -z-10"></div>

        {/* Global Trial Expiration Banner */}
        {isTrialExpired && (
          <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-medium z-30 sticky top-0">
            Your free Growth trial has ended. Please subscribe to continue using TakeaBite.
            <Link href="/pricing" className="ml-3 underline font-bold hover:text-red-100">
              Upgrade Now
            </Link>
          </div>
        )}

        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-20 shrink-0 items-center justify-between border-b border-neutral-200/60 bg-white/80 px-4 md:px-8 backdrop-blur-md shadow-sm">
          {/* Left: Workspace Selector & Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              className="lg:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-200 shadow-inner overflow-hidden">
               <Logo size="lg" variant="icon" />
            </div>
            <div 
              onClick={() => {
                // If they had the plan, this would open a modal to add a workspace.
                // For now, redirect them to the growth plan pricing.
                router.push('/pricing');
              }}
              className="flex cursor-pointer items-center gap-2 rounded-lg py-1 px-2 hover:bg-neutral-50 transition-colors"
            >
              <div>
                <h3 className="text-sm font-bold text-neutral-900 leading-tight truncate max-w-[120px] md:max-w-xs">{shopName}</h3>
                <p className="hidden md:block text-[10px] font-medium text-brand-600 uppercase tracking-wide">Owner Workspace</p>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0" />
            </div>
          </div>

          {/* Right: Search, Notifications, Profile */}
          <div className="flex items-center gap-2 md:gap-4">

            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900 hover:bg-neutral-50 shrink-0">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 md:gap-3 cursor-pointer rounded-full border border-neutral-200 bg-white p-1 md:py-1.5 md:pl-1.5 md:pr-4 shadow-sm hover:bg-neutral-50 transition-colors shrink-0">
              <div className="h-7 w-7 md:h-7 md:w-7 overflow-hidden rounded-full border border-neutral-100">
                <img /* eslint-disable-next-line @next/next/no-img-element */ src={`https://ui-avatars.com/api/?name=${userName}&background=fef2f2&color=ef4444`} alt="Profile" className="h-full w-full object-cover" />
              </div>
              <span className="hidden md:block text-sm font-medium text-neutral-700">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  );
}
