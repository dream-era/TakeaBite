"use client";

import React, { useState } from "react";
import { useStaffStore } from "@/store/useStaffStore";
import { UserCircle, Shield, Phone, Mail, Clock, Lock, Store } from "lucide-react";
import { getRelativeTime } from "@/lib/utils/timeFormatter";

export default function CashierProfilePage() {
  const { currentSession } = useStaffStore();
  const [showPinReset, setShowPinReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePinReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const formData = new FormData(e.currentTarget);
    const newPin = formData.get("newPin") as string;
    
    try {
      const res = await fetch("/api/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "updateStaffPin", 
          staffId: currentSession?.staffId, 
          newPin 
        }),
      });
      
      if (!res.ok) throw new Error("Failed to update PIN");
      setMessage("PIN updated successfully! You will use it next time you log in.");
      setShowPinReset(false);
    } catch (err: any) {
      setMessage(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!currentSession) return null;

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-indigo-600" />
          My Profile
        </h1>
        <p className="text-neutral-500 mt-1">Manage your cashier account</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-neutral-100 bg-gradient-to-br from-indigo-50 to-white">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-black shadow-inner">
              {currentSession.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-black text-neutral-900">{currentSession.name}</h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full">
                  Cashier
                </span>
                <span className="text-sm font-semibold text-neutral-500 flex items-center gap-1">
                  <Store className="h-4 w-4" /> Restaurant ID: {currentSession.restaurantId.slice(0,8)}...
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Phone className="h-3 w-3"/> Phone Number</label>
                <p className="font-semibold text-neutral-900">{currentSession.phone || 'Not Provided'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Mail className="h-3 w-3"/> Email Address</label>
                <p className="font-semibold text-neutral-900">{currentSession.email || 'Not Provided'}</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Shield className="h-3 w-3"/> Status</label>
                <p className="font-semibold text-green-600 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500"></span> Active Account</p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Clock className="h-3 w-3"/> Last Login</label>
                <p className="font-semibold text-neutral-900">{getRelativeTime(new Date().toISOString())}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-neutral-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Security</h3>
                <p className="text-sm text-neutral-500">Update your access PIN</p>
              </div>
              {!showPinReset && (
                <button 
                  onClick={() => setShowPinReset(true)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                >
                  Change PIN
                </button>
              )}
            </div>

            {showPinReset && (
              <form onSubmit={handlePinReset} className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-neutral-700 mb-2">New 4-Digit PIN</label>
                  <input 
                    type="password" 
                    name="newPin"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    className="w-full sm:w-64 px-4 py-3 bg-white border border-neutral-200 rounded-xl text-lg tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-neutral-500 mt-2">Must be exactly 4 numbers.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {loading ? 'Updating...' : 'Save New PIN'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowPinReset(false); setMessage(""); }}
                    className="px-6 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {message && (
              <p className={`mt-4 text-sm font-semibold ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
