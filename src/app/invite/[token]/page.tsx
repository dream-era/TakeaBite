"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStaffStore } from "@/store/useStaffStore";
import { Store, User, ArrowRight, ShieldCheck, Mail } from "lucide-react";

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { invitations, acceptInvitation } = useStaffStore();
  const [mounted, setMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    password: ''
  });

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const invite = invitations.find(i => i.token === token);

  if (!invite) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="h-20 w-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invalid Invitation</h1>
          <p className="text-neutral-500 mb-8">This invitation link has expired or does not exist.</p>
          <button onClick={() => router.push('/staff/login')} className="bg-neutral-900 text-white font-bold py-3 px-8 rounded-xl">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (invite.status === 'accepted') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl text-center">
          <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Already Accepted</h1>
          <p className="text-neutral-500 mb-8">This invitation has already been accepted.</p>
          <button onClick={() => router.push('/staff/login')} className="bg-brand-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.password) return;

    acceptInvitation(token, formData.name);
    
    // Route based on role
    if (invite.role === 'Cook') {
      router.push('/staff/cook');
    } else if (invite.role === 'Juice Maker') {
      router.push('/staff/juice-maker');
    } else {
      router.push('/staff/login');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-neutral-100">
        <div className="flex justify-center mb-8">
          <div className="h-16 w-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Store className="h-8 w-8" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">You&apos;ve been invited!</h1>
          <p className="text-neutral-600 text-sm">
            You have been invited to join <strong>{invite.restaurantName}</strong> as a <strong>{invite.role}</strong>.
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="email" 
                value={invite.email}
                disabled
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-500 text-sm outline-none" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className="w-full border border-neutral-200 rounded-xl py-3 pl-10 pr-4 text-neutral-900 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-50 outline-none transition-all" 
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Create Password</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
              className="w-full border border-neutral-200 rounded-xl py-3 px-4 text-neutral-900 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-50 outline-none transition-all" 
              required
            />
          </div>

          <div className="pt-4">
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 active:scale-[0.98]">
              Accept Invitation <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-neutral-400">Or continue with</span>
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
