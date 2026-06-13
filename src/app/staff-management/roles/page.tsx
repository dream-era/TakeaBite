"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, LayoutDashboard, ClipboardList, MenuSquare, Users, QrCode,
  CreditCard, BarChart3, UsersRound, Bell, Settings, ChevronDown,
  MessageCircle, Info, Flame, CheckCircle2, MoreVertical, RotateCcw, Plus } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { toast } from "react-hot-toast";

export default function RolesPermissionsPage() {
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
    { 
      icon: Users, 
      label: "Staff Workspace", 
      active: true, 
      href: "/staff-management",
      subItems: [
        { label: "Team Members", active: false, href: "/staff-management" },
        { label: "Roles & Permissions", active: true, href: "/staff-management/roles" }
      ]
    },
    { icon: QrCode, label: "QR & Tables", href: "/qr-generation" },
    { icon: CreditCard, label: "Payments", href: "/payments" },
    { icon: BarChart3, label: "Analytics", href: "#", locked: true },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Permissions Data
  const permissionColumns = [
    "View Orders", "Manage Orders", "Kitchen Workflow", "Manage Menu", 
    "Manage Staff", "Payments", "Analytics", "QR Tables", "Settings"
  ];

  const rolesData = [
    {
      id: "owner", initials: "OW", color: "bg-purple-100 text-purple-700", name: "Owner",
      description: "Full access to all features and settings.",
      perms: [true, true, true, true, true, true, true, true, true],
      isDefault: true
    },
    {
      id: "servant", initials: "SV", color: "bg-orange-100 text-orange-700", name: "Servant",
      description: "Manage operations and team members.",
      perms: [true, true, true, true, true, false, true, true, false],
      isDefault: false
    },
    {
      id: "server", initials: "SR", color: "bg-green-100 text-green-700", name: "Server",
      description: "Manage tables and serve customers.",
      perms: [true, true, false, false, false, true, false, true, false],
      isDefault: false
    },
    {
      id: "kitchen", initials: "KT", color: "bg-blue-100 text-blue-700", name: "Kitchen Staff",
      description: "Prepare and manage kitchen orders.",
      perms: [false, false, true, false, false, false, false, false, false],
      isDefault: false
    },
    {
      id: "cashier", initials: "CS", color: "bg-pink-100 text-pink-700", name: "Cashier",
      description: "Handle payments and billing.",
      perms: [false, false, false, false, false, true, false, false, false],
      isDefault: false
    },
    {
      id: "delivery", initials: "DP", color: "bg-yellow-100 text-yellow-700", name: "Delivery Partner",
      description: "Manage delivery and order status.",
      perms: [true, true, false, false, false, false, false, true, false],
      isDefault: false
    },
    {
      id: "custom", initials: "CR", color: "bg-neutral-100 text-neutral-700", name: "Custom Role",
      description: "Create a custom role with selected permissions.",
      perms: [], // Special case for UI
      isCustom: true
    }
  ];

  return (
    <div className="flex h-screen w-full bg-[#F5F5F1] overflow-hidden font-sans">
      {/* ── Left Sidebar ── */}
      <aside className="hidden w-64 flex-col bg-white lg:flex border-r border-neutral-200 z-10 shadow-[2px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex h-20 items-center justify-center px-6 border-b border-neutral-100">
          <Link href="/" className="group w-full">
            <Logo size="md" className="transition-transform duration-300 group-hover:scale-105" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {sidebarMenuItems.map((item, index) => (
            <div key={index} className="flex flex-col">
                <Link onClick={item.locked ? handleLockedClick : undefined} href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    item.active
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
                >
                <item.icon className={`h-5 w-5 ${item.active ? "text-white" : "text-neutral-400"}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.locked && <Lock className="h-3.5 w-3.5 text-neutral-400 opacity-60 ml-2" />} {item.badge && !item.locked && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${item.active ? "bg-white text-brand-600" : "bg-brand-600 text-white"}`}>
                    {item.badge}
                    </span>
                )}
                {item.subItems && (
                     <ChevronDown className="h-4 w-4 text-white opacity-80" />
                )}
                </Link>
                {/* Submenu Items */}
                {item.subItems && item.active && (
                    <div className="mt-1 ml-4 border-l-2 border-neutral-100 pl-4 space-y-1 py-1">
                        {item.subItems.map((sub, i) => (
                            <Link href={sub.href} key={i} className={`flex items-center gap-2 w-full py-1.5 text-sm font-medium transition-colors ${sub.active ? "text-brand-600" : "text-neutral-500 hover:text-neutral-900"}`}>
                                {sub.active ? <div className="h-1.5 w-1.5 rounded-full bg-brand-600"></div> : <div className="h-1.5 w-1.5 rounded-full bg-transparent"></div>}
                                {sub.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
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
      <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden relative">
        
        {/* Soft Background Gradient at the top */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-white/50 -z-10"></div>

        {/* Top Header */}
        <header className="flex h-20 items-center justify-between px-8 z-20 border-b border-neutral-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                 <div className="h-6 w-6 overflow-hidden rounded-md bg-orange-100 flex items-center justify-center shrink-0 border border-neutral-200">
                    <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=150&q=80" alt="Shop" className="h-full w-full object-cover" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-900 leading-none">{shopName}</span>
                    <span className="text-[10px] text-neutral-500 font-medium">Main Branch</span>
                 </div>
                 <ChevronDown className="h-4 w-4 text-neutral-400 ml-2" />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent hover:bg-neutral-100 text-neutral-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 flex h-3 w-3 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white ring-2 ring-white">8</span>
              </button>
              <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent hover:bg-neutral-100 text-neutral-600 transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span className="absolute right-2 top-2 flex h-3 w-3 items-center justify-center rounded-full bg-brand-600 text-[8px] font-bold text-white ring-2 ring-white">3</span>
              </button>
            </div>
            <div className="flex items-center gap-3 pl-2 border-l border-neutral-300">
              <div className="hidden flex-col md:flex items-end cursor-pointer group">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-neutral-900 leading-tight">Amit Chauhan</span>
                </div>
                <span className="text-xs text-neutral-500 leading-tight">Owner</span>
              </div>
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-1 ring-neutral-200">
                <img src={`https://ui-avatars.com/api/?name=${userName}&background=fef2f2&color=ef4444`} alt="Profile" className="h-full w-full object-cover" />
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-400 cursor-pointer hover:text-neutral-600" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="mx-auto w-full max-w-[1400px] px-8 py-8 pb-24">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Roles & Permissions</h1>
                    <p className="mt-1.5 text-sm text-neutral-500">Manage staff access and workspace permissions.</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-700">
                    <Plus className="h-4 w-4" /> Create Role
                </button>
            </div>

            {/* Info Banner */}
            <div className="rounded-xl bg-blue-50/80 p-4 border border-blue-100 flex gap-3 items-start mb-6">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 font-medium leading-relaxed">
                    <p className="font-bold text-blue-900">Permissions control what staff members can see and manage inside the workspace.</p>
                    <p>Changes will be applied to all team members with these roles.</p>
                </div>
            </div>

            {/* Permissions Table/Grid */}
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50/50">
                                <th className="p-5 font-bold text-neutral-900 text-sm whitespace-nowrap">Role</th>
                                <th className="p-5 font-bold text-neutral-900 text-sm min-w-[200px]">Description</th>
                                <th colSpan={9} className="p-5 font-bold text-neutral-900 text-sm text-center border-b border-neutral-100 relative pt-2 pb-0 h-10">
                                    <span className="absolute top-3 left-0 right-0 text-center text-xs text-neutral-900">Permissions</span>
                                </th>
                            </tr>
                            <tr className="border-b border-neutral-200">
                                <th className="p-0"></th>
                                <th className="p-0"></th>
                                {permissionColumns.map((col, i) => (
                                    <th key={i} className="p-3 pb-4 font-bold text-neutral-800 text-[11px] text-center max-w-[80px] leading-tight">
                                        {col}
                                    </th>
                                ))}
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {rolesData.map((role, i) => (
                                <tr key={i} className="hover:bg-neutral-50/50 transition-colors group">
                                    <td className="p-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${role.color}`}>
                                                {role.initials}
                                            </div>
                                            <span className="font-bold text-neutral-900 text-sm">{role.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-5 text-xs text-neutral-600 font-medium max-w-[220px]">
                                        {role.description}
                                    </td>
                                    
                                    {role.isCustom ? (
                                        // Custom Role Row rendering
                                        <>
                                            {permissionColumns.map((_, j) => (
                                                <td key={j} className="p-3 text-center">
                                                    <span className="text-[10px] font-semibold text-neutral-400">Custom Role</span>
                                                </td>
                                            ))}
                                        </>
                                    ) : (
                                        // Standard Role Row rendering
                                        <>
                                            {role.perms.map((hasPerm, j) => (
                                                <td key={j} className="p-3 text-center">
                                                    {hasPerm ? (
                                                        <div className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                        </div>
                                                    ) : (
                                                        <div className="mx-auto h-1 w-4 rounded-full bg-neutral-200"></div>
                                                    )}
                                                </td>
                                            ))}
                                        </>
                                    )}

                                    {/* Action Column */}
                                    <td className="p-5 pr-6 text-right whitespace-nowrap">
                                        {role.isDefault ? (
                                            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-400 mr-2">Default</span>
                                        ) : role.isCustom ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="rounded-lg border border-neutral-200 bg-white px-4 py-1.5 text-xs font-bold text-neutral-700 shadow-sm hover:bg-neutral-50">Edit</button>
                                                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="flex h-8 w-8 ml-auto items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Actions */}
                <div className="bg-neutral-50/50 border-t border-neutral-100 p-5 flex items-center justify-between">
                    <button className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors">
                        <RotateCcw className="h-4 w-4 text-neutral-400" /> Reset to Default
                    </button>
                    <div className="flex items-center gap-3">
                        <button className="rounded-xl border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 transition-colors">
                            Cancel
                        </button>
                        <button className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 hover:bg-brand-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
