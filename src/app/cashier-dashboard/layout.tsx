"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShoppingBag, CreditCard, History, 
  Receipt, UserCircle, Utensils, LogOut
} from "lucide-react";
import { useStaffStore } from "@/store/useStaffStore";

interface CashierLayoutProps {
  children: React.ReactNode;
}

export default function CashierLayout({ children }: CashierLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentSession, clearSession } = useStaffStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && !currentSession) {
      router.push('/staff-login');
    } else if (mounted && currentSession && currentSession.role !== 'cashier') {
      // If a non-cashier tries to access, kick them out
      router.push('/staff-login');
    }
  }, [mounted, currentSession, router]);

  if (!mounted || !currentSession || currentSession.role !== 'cashier') return null;

  const sidebarMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/cashier-dashboard" },
    { icon: ShoppingBag, label: "Orders", href: "/cashier-dashboard/orders" },
    { icon: CreditCard, label: "Payments", href: "/cashier-dashboard/payments" },
    { icon: History, label: "Order History", href: "/cashier-dashboard/history" },
    { icon: Receipt, label: "Customer Bills", href: "/cashier-dashboard/bills" },
  ];

  const handleLogout = () => {
    clearSession();
    router.push('/staff-login');
  };

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* ── Left Sidebar (Desktop Only) ── */}
      <aside className="hidden lg:flex inset-y-0 left-0 z-50 w-64 flex-col border-r border-neutral-200 bg-white/95 backdrop-blur-md shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex h-20 shrink-0 items-center px-6 border-b border-neutral-100">
          <div className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-neutral-900 leading-none">
                TakeaBite
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase mt-1">
                Cashier Portal
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {sidebarMenuItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== '/cashier-dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-indigo-600" : "text-neutral-400"}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <Link
            href="/cashier-dashboard/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors mb-2 ${
              pathname === '/cashier-dashboard/profile' ? "bg-indigo-50 text-indigo-700" : "text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <UserCircle className="h-5 w-5" />
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="truncate font-semibold">{currentSession.name}</span>
              <span className="text-xs text-neutral-400">Cashier</span>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-neutral-200 shrink-0 z-40 relative">
           <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
              <Utensils className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-lg font-bold text-neutral-900 tracking-tight">TakeaBite</span>
          </div>
          <div className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
            Cashier
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto w-full pb-20 lg:pb-0 scroll-smooth">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 pb-safe z-50">
        <div className="flex items-center justify-around h-16 px-2">
          <Link 
            href="/cashier-dashboard"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname === '/cashier-dashboard' ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link 
            href="/cashier-dashboard/orders"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.includes('/orders') ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="text-[10px] font-medium">Orders</span>
          </Link>
          <Link 
            href="/cashier-dashboard/payments"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.includes('/payments') ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-[10px] font-medium">Payments</span>
          </Link>
          <Link 
            href="/cashier-dashboard/bills"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.includes('/bills') ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-[10px] font-medium">Bills</span>
          </Link>
          <Link 
            href="/cashier-dashboard/profile"
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${pathname.includes('/profile') ? 'text-indigo-600' : 'text-neutral-400'}`}
          >
            <UserCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
