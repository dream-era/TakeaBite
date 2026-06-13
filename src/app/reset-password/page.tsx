"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { Logo } from "@/components/shared/Logo";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score++;
    if (pass.length > 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 5
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (strength < 2) {
      toast.error("Please choose a stronger password.");
      return;
    }

    setIsLoading(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      // Update user password. Since the user clicked a magic link, they should have an active session for recovery.
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message || "Failed to update password. Your link may have expired.");
        setIsLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while updating your password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#f5f0eb] via-[#faf6f1] to-[#f0ebe4] px-4 py-8">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[20%] top-[10%] h-40 w-40 rounded-full bg-gradient-to-br from-brand-100 to-amber-100/40 blur-2xl" />
        <div className="absolute bottom-[20%] right-[20%] h-48 w-48 rounded-full bg-gradient-to-br from-rose-100 to-orange-100/40 blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-[450px]">
        {/* Outer glass layer */}
        <div className="absolute -bottom-2 -left-2 -right-2 top-2 rounded-3xl border border-white/40 bg-white/30 backdrop-blur-md" />
        
        {/* Main card */}
        <div className="relative rounded-3xl border border-white/50 bg-white/80 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <Link href="/" className="group mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-50 shadow-xl border border-neutral-200 transition-transform duration-300 hover:scale-105">
              <Logo size="lg" variant="icon" />
            </Link>
            <h1 className="text-3xl font-bold text-neutral-900">Set New Password</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Your new password must be different from previously used passwords.
            </p>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Password Updated!</h2>
              <p className="mt-2 text-sm text-neutral-500">Your password has been changed successfully.</p>
              <Link 
                href="/login"
                className="mt-8 w-full rounded-full bg-brand-600 py-3.5 text-center text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl"
              >
                BACK TO LOGIN
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pl-12 pr-12 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword.length > 0 && (
                <div className="space-y-1.5 px-1">
                  <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-neutral-100">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-full flex-1 transition-colors duration-300 ${
                          strength >= level
                            ? strength <= 2
                              ? "bg-rose-500"
                              : strength === 3
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                            : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {strength <= 2 ? "Weak" : strength === 3 ? "Medium" : "Strong"} password
                  </p>
                </div>
              )}

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pl-12 pr-12 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="mt-6 w-full rounded-full bg-brand-600 py-3.5 text-sm font-bold tracking-wide text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
