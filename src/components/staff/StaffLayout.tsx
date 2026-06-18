"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStaffStore, StaffRole } from "@/store/useStaffStore";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

interface StaffLayoutProps {
  children: React.ReactNode;
  allowedRoles: StaffRole[];
  themeColor?: "red" | "green" | "blue"; // red for Cook, green for Juice Maker, blue for Server
}

export function StaffLayout({ children, allowedRoles, themeColor = "red" }: StaffLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentSession } = useStaffStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (wakeLock) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (mounted && !currentSession) {
      router.push('/staff-login');
    } else if (mounted && currentSession && !currentSession.fingerprint) {
      // Self-heal legacy sessions without forcing logout
      const newFingerprint = globalThis.crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      useStaffStore.getState().setSession({ ...currentSession, fingerprint: newFingerprint });
    }
  }, [mounted, currentSession, router]);

  if (!mounted) return null;
  if (!currentSession) return null;

  const isAuthorized = allowedRoles.includes(currentSession.role as any);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl">
          <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Unauthorized Access</h1>
          <p className="text-neutral-500 mb-8">
            You are logged in as a <strong>{currentSession.role}</strong> and cannot access this page.
          </p>
          <button 
            onClick={() => {
              if (currentSession.role === 'cook' || currentSession.role === 'chef') router.push('/cook-dashboard');
              else if (currentSession.role === 'juice_maker' || currentSession.role === 'juice') router.push('/juice-dashboard');
              else if (currentSession.role === 'server') router.push('/server-dashboard');
              else if (currentSession.role === 'servant') router.push('/servant-dashboard');
              else if (currentSession.role === 'cashier') router.push('/cashier-dashboard');
            }}
            className="w-full bg-neutral-900 text-white font-bold py-3 px-8 rounded-xl"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  const themeClasses = themeColor === 'red' 
    ? { navActive: 'text-[#D32F2F]', bg: 'bg-[#D32F2F]' }
    : themeColor === 'blue'
    ? { navActive: 'text-[#1976D2]', bg: 'bg-[#1976D2]' }
    : { navActive: 'text-[#1B5E20]', bg: 'bg-[#1B5E20]' };

  return (
    <div className="bg-neutral-50 min-h-screen pb-20 max-w-md mx-auto shadow-2xl relative">
      {children}

      {/* Staff Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-neutral-200 z-50">
        <div className="flex justify-around items-center h-16">
          <Link 
            href={
              currentSession.role === 'cook' || currentSession.role === 'chef' || currentSession.role === 'Cook' ? '/cook-dashboard' :
              currentSession.role === 'juice_maker' || currentSession.role === 'juice' || currentSession.role === 'Juice Maker' ? '/juice-dashboard' :
              currentSession.role === 'server' || currentSession.role === 'Server' ? '/server-dashboard' :
              currentSession.role === 'servant' || currentSession.role === 'Servant' ? '/servant-dashboard' :
              '/server-dashboard'
            } 
            className={`flex flex-col items-center justify-center w-full h-full ${pathname.includes('dashboard') ? themeClasses.navActive : 'text-neutral-400'}`}
          >
            {currentSession.role === 'cook' || currentSession.role === 'chef' || currentSession.role === 'Cook' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V9a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v11a2 2 0 0 0 2 2z"/><path d="M10 5v4"/><path d="M14 5v4"/><path d="M10 2v3"/><path d="M14 2v3"/><path d="M8 9h8"/></svg>
            )}
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Orders</span>
          </Link>

          {(currentSession.role === 'cook' || currentSession.role === 'chef' || currentSession.role === 'juice_maker' || currentSession.role === 'juice' || currentSession.role === 'servant' || currentSession.role === 'Servant') && (
            <Link 
              href="/staff/stock" 
              className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/staff/stock' ? themeClasses.navActive : 'text-neutral-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Stock</span>
            </Link>
          )}

          <Link 
            href="/staff/profile" 
            className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/staff/profile' ? themeClasses.navActive : 'text-neutral-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
