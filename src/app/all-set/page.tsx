"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  CheckCircle2,
  Download,
  Printer,
  ArrowRight,
  UserPlus,
  UserCheck,
  Store,
  ConciergeBell,
  Crown } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { toast } from "react-hot-toast";

export default function AllSetPage() {
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    toast("This feature will be launched soon!", { icon: "🚀" });
  };

  const [userName, setUserName] = useState("Amit");
  const [shopName, setShopName] = useState("Mario's Pizza House");

  useEffect(() => {
    const storedName = localStorage.getItem('serveflow_user_name');
    if (storedName) {
      setUserName(storedName.split(' ')[0]);
    }
    const storedBusiness = localStorage.getItem('serveflow_business_name');
    if (storedBusiness) {
      setShopName(storedBusiness);
    }
  }, []);

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
    { number: 1, title: "Shop Details", completed: true },
    { number: 2, title: "Menu Setup", completed: true },
    { number: 3, title: "Business Settings", completed: true },
    { number: 4, title: "QR Generation", completed: true },
    { number: 5, title: "You're All Set!", active: true },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="hidden w-64 flex-col border-r border-neutral-200 bg-white/80 backdrop-blur-md lg:flex shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex h-20 items-center justify-between px-6">
          <Link href="/" className="group">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
          </Link>
        </div>
        
        {/* Active Shop Selector Fake */}
        <div className="px-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-2 shadow-sm">
                <div className="flex h-8 w-8 overflow-hidden rounded-md bg-orange-100">
                     <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=150&q=80" alt="Shop" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-bold text-neutral-900">{shopName}</p>
                    <p className="text-xs text-neutral-500">Main Branch</p>
                </div>
                <div className="text-neutral-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-hide">
          {sidebarMenuItems.map((item, index) => (
            <Link onClick={item.locked ? handleLockedClick : undefined} href={item.href || "#"}
              key={index}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                item.label === 'Dashboard' // None active, but dashboard could be default look
                  ? "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900" 
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <item.icon className="h-5 w-5 text-neutral-400" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.label === 'Orders' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">12</span>
              )}
              {item.label === 'Notifications' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">5</span>
              )}
            </Link>
          ))}
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

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
            </button>
            <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white border border-neutral-200 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900">
              <ClipboardList className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white"></span>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-neutral-200">
                <img src="https://i.pravatar.cc/150?u=amit" alt="Profile" className="h-full w-full object-cover" />
                </div>
                <div className="hidden flex-col md:flex">
                    <span className="text-sm font-bold text-neutral-900 leading-tight">{userName} Chauhan</span>
                    <span className="text-xs text-neutral-500 leading-tight">Owner</span>
                </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto w-full max-w-5xl px-8 py-8 pb-24">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 flex items-center gap-2">Your Digital Shop is Ready 🎉</h2>
            <p className="mt-2 text-neutral-500">Your customers can now scan, browse, and place orders instantly.</p>
          </div>

          {/* Stepper */}
          <div className="mb-10 w-full overflow-x-auto pb-4 scrollbar-hide">
            <div className="flex min-w-max items-center justify-between w-full">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold transition-colors ${
                      step.active 
                        ? "border-brand-500 bg-white text-brand-600" 
                        : step.completed
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-neutral-200 bg-white text-neutral-400"
                    }`}>
                      {step.completed ? <CheckCircle2 className="h-8 w-8 text-brand-500 bg-white rounded-full border-2 border-white" /> : step.number}
                    </div>
                    <span className={`text-sm font-bold ${step.active || step.completed ? "text-neutral-900" : "text-neutral-400"}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-2 h-[2px] flex-1 bg-neutral-200 min-w-[40px]"></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* ── Left Success Column ── */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] h-full flex flex-col">
                <div className="flex flex-col items-center justify-center mb-10 mt-4">
                  <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-50">
                    <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping opacity-75"></div>
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                    {/* Confetti fake items */}
                    <div className="absolute -top-4 -left-4 text-xl">🎉</div>
                    <div className="absolute top-0 -right-2 text-xl">✨</div>
                    <div className="absolute bottom-4 -left-6 text-xl">🎊</div>
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">Congratulations!</h3>
                  <p className="text-neutral-500">You have successfully set up your digital shop.</p>
                </div>

                <div className="space-y-3 flex-1">
                  {/* Data Rows */}
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-brand-500">
                        <Store className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-neutral-700">Shop Name</span>
                    </div>
                    <span className="font-bold text-neutral-900">{shopName}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                        <ConciergeBell className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-neutral-700">Total Menu Items</span>
                    </div>
                    <span className="font-bold text-neutral-900">48 Items</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-500">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-neutral-700">Active QR Tables</span>
                    </div>
                    <span className="font-bold text-neutral-900">7 Tables</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-500">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-neutral-700">Staff Invites Sent</span>
                    </div>
                    <span className="font-bold text-neutral-900">3 Invited</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 transition-colors hover:bg-neutral-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                        <Crown className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-neutral-700">Current Plan</span>
                    </div>
                    <span className="font-bold text-neutral-900">Pro Plan</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Column (QR & Next Steps) ── */}
            <div className="space-y-6 lg:col-span-5">
              {/* QR Preview Card */}
              <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-neutral-900">Your QR Code Preview</h3>
                  <p className="text-sm text-neutral-500">Customers scan this QR to access your digital menu.</p>
                </div>

                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm mb-4">
                    {/* Simulated QR Code using nested divs for the pattern */}
                    <div className="relative h-48 w-48 bg-white border-8 border-white p-1 flex items-center justify-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://serveflow.demo" alt="QR" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-10 w-10 rounded-lg bg-neutral-50 overflow-hidden border-2 border-white flex items-center justify-center shadow-md">
                                <Logo size="lg" variant="icon" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h4 className="font-bold text-neutral-900">{shopName}</h4>
                      <p className="text-xs text-neutral-500 mt-1"><span className="bg-neutral-100 px-2 py-1 rounded-md">Table 1</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100">
                    <Download className="h-4 w-4" /> Download
                  </button>
                  <button className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900">
                    <Printer className="h-4 w-4" /> Print
                  </button>
                </div>
              </div>

              {/* What Happens Next */}
              <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-neutral-900 mb-6">What Happens Next?</h3>
                
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 font-bold shadow-sm ring-4 ring-white relative z-10 border border-brand-100">
                      1
                    </div>
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-neutral-900">Print or place QR codes on tables</h4>
                      <p className="text-xs text-neutral-500 mt-1">Make it easy for customers to find and scan.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 font-bold shadow-sm ring-4 ring-white relative z-10 border border-orange-100">
                      2
                    </div>
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-neutral-900">Customers scan and order instantly</h4>
                      <p className="text-xs text-neutral-500 mt-1">They can browse your menu and place orders.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 font-bold shadow-sm ring-4 ring-white relative z-10 border border-green-100">
                      3
                    </div>
                    <div className="pt-2">
                      <h4 className="text-sm font-bold text-neutral-900">Orders appear live in your workspace</h4>
                      <p className="text-xs text-neutral-500 mt-1">Manage and fulfill orders in real-time.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_-4px_rgba(229,9,20,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_25px_-4px_rgba(229,9,20,0.6)]">
              <LayoutDashboard className="h-4 w-4" /> Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
            <button className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-8 py-3.5 text-sm font-bold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900">
              <Download className="h-4 w-4" /> Download QR Codes
            </button>
            <Link href="/staff-management" className="flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-8 py-3.5 text-sm font-bold text-neutral-700 shadow-sm transition-all hover:bg-neutral-50 hover:text-neutral-900">
              <UserPlus className="h-4 w-4" /> Invite Staff
            </Link>
          </div>

          {/* Motivational Banner */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-50 p-6 border border-brand-100 text-center relative overflow-hidden">
             <div className="absolute right-0 bottom-0 opacity-20">
                <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 80L20 60L40 70L60 40L80 50L120 0V80H0Z" fill="#E50914"/>
                    <path d="M0 80L20 65L40 75L60 45L80 55L120 10V80H0Z" fill="#B80710"/>
                </svg>
             </div>
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-3">
                 <div className="text-3xl">🎉</div>
                 <div>
                    <h4 className="text-base font-bold text-neutral-900">Your business is now ready to receive digital orders in real-time.</h4>
                    <p className="text-sm text-neutral-600 mt-1">Keep growing, keep serving, and we&apos;ll handle the rest! ❤️</p>
                 </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
