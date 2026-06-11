"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAppUrl } from "@/lib/url-config";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetStateAndClose = () => {
    setEmail("");
    setIsLoading(false);
    onClose();
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppUrl()}/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);
      }

      toast.success("If an account exists, a password reset link has been sent to your email.");
      resetStateAndClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to request password reset. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm transition-opacity"
        onClick={resetStateAndClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all">
        <button
          onClick={resetStateAndClose}
          className="absolute right-5 top-5 rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Mail className="h-6 w-6" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-900">
            Reset Password
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Registered Email"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pl-12 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full rounded-full bg-brand-600 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? "SENDING LINK..." : "SEND RESET LINK"}
          </button>
        </form>
      </div>
    </div>
  );
}
