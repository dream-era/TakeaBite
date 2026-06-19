"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Phone, ArrowRight, Lock } from "lucide-react";
import { loginStaff } from "@/actions/staff";
import { useStaffStore } from "@/store/useStaffStore";
import { Logo } from "@/components/shared/Logo";

export default function StaffLoginPage() {
  const router = useRouter();
  const { currentSession, setSession } = useStaffStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: '',
    pin: ''
  });
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // If already logged in, redirect based on role
    if (currentSession && currentSession.expiry > Date.now()) {
      if (currentSession.role === 'cook' || currentSession.role === 'chef') router.push('/cook-dashboard');
      else if (currentSession.role === 'juice_maker' || currentSession.role === 'juice') router.push('/juice-dashboard');
      else if (currentSession.role === 'cashier') router.push('/cashier-dashboard');
      else if (currentSession.role === 'server') router.push('/server-dashboard');
      else if (currentSession.role === 'servant') router.push('/servant-dashboard');
      else router.push('/staff');
    }
  }, [currentSession, router]);

  if (!mounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const res = await loginStaff({ phone: formData.phone, pin: formData.pin });
      if (!res.success) {
        setError(res.error);
        return;
      }
      
      setSession(res.data);
      router.push(res.data.redirectTo);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-neutral-100">
        <div className="flex justify-center mb-8">
          <Logo variant="icon" className="h-16 w-auto" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Staff Portal</h1>
          <p className="text-neutral-500 text-sm">Sign in to view your dashboard.</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl p-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="tel" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 9876543210"
                className="w-full border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-900 text-sm focus:border-brand-500 focus:ring-2 outline-none transition-all" 
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">PIN (6-digits)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="password" 
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value})}
                placeholder="••••••"
                maxLength={6}
                className="w-full border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-900 text-sm focus:border-brand-500 focus:ring-2 outline-none transition-all tracking-widest font-mono" 
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : (
                <>Sign In <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
