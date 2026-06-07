"use client";
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store, User, ArrowRight, Lock } from "lucide-react";
import { loginStaff } from "@/actions/staff";
import { useStaffStore } from "@/store/useStaffStore";

export default function StaffLoginPage() {
  const router = useRouter();
  const { currentSession, setSession } = useStaffStore();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // If already logged in, redirect
    if (currentSession && currentSession.expiry > Date.now()) {
      if (currentSession.role === 'chef' || currentSession.role === 'Cook') router.push('/staff/cook');
      else if (currentSession.role === 'juice' || currentSession.role === 'Juice Maker') router.push('/staff/juice-maker');
      else router.push('/staff');
    }
  }, [currentSession, router]);

  if (!mounted) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const res = await loginStaff({ email: formData.email, password: formData.password });
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
          <div className="h-16 w-16 bg-neutral-900 text-white rounded-2xl flex items-center justify-center shadow-inner">
            <Store className="h-8 w-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Staff Portal</h1>
          <p className="text-neutral-500 text-sm">Sign in to view your orders and tasks.</p>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-xl p-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="email" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
                className="w-full border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-900 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all" 
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                placeholder="••••••••"
                className="w-full border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-900 text-sm focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-all" 
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : (
                <>Sign In <ArrowRight className="h-5 w-5" /></>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-400">Or sign in with</span>
            </div>
          </div>
          <button className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold py-3 px-4 rounded-xl transition-colors shadow-sm">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
            Google
          </button>
        </div>
      </div>
    </div>
  );
}
