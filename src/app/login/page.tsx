"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Utensils } from "lucide-react";
import { toast } from "react-hot-toast";
import ForgotPasswordModal from "@/components/auth/forgot-password-modal";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // On successful login, redirect to dashboard.
      // If onboarding isn't complete, the middleware will redirect them to /onboarding
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to initialize Google login.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-[#f5f0eb] via-[#faf6f1] to-[#f0ebe4]">
      {/* ── Floating decorative elements ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Glass spheres */}
        <div className="absolute -left-16 top-[10%] h-40 w-40 rounded-full bg-gradient-to-br from-white/40 to-amber-100/20 blur-sm" />
        <div className="absolute -right-12 top-[5%] h-48 w-48 rounded-full bg-gradient-to-br from-white/50 to-amber-50/30 blur-sm" />
        <div className="absolute -right-8 bottom-[15%] h-36 w-36 rounded-full bg-gradient-to-br from-white/40 to-amber-100/20 blur-sm" />
        <div className="absolute -left-10 bottom-[20%] h-32 w-32 rounded-full bg-gradient-to-br from-white/30 to-amber-50/20 blur-sm" />

        {/* Gradient orbs */}
        <div className="absolute left-[30%] top-[8%] h-6 w-6 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 opacity-70 blur-[1px]" />
        <div className="absolute right-[25%] top-[15%] h-8 w-8 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 opacity-60 blur-[1px]" />
        <div className="absolute left-[15%] bottom-[30%] h-5 w-5 rounded-full bg-gradient-to-br from-brand-400 to-rose-500 opacity-70 blur-[1px]" />
        <div className="absolute right-[20%] bottom-[25%] h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 opacity-60 blur-[1px]" />

        {/* Decorative 3D icon top-right */}
        <div className="absolute right-[12%] top-[18%] hidden lg:block">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-blue-800 p-3 shadow-xl rotate-12">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="h-full w-full">
              <circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><circle cx="12" cy="12" r="2" />
              <line x1="6" y1="6" x2="12" y2="12" /><line x1="18" y1="6" x2="12" y2="12" /><line x1="6" y1="18" x2="12" y2="12" /><line x1="18" y1="18" x2="12" y2="12" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Top navbar ── */}
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group" id="login-nav-logo">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 transition-transform duration-300 group-hover:scale-110">
            <Utensils className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">
            TakeaBite
          </span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-white/60 hover:text-neutral-900"
          id="login-nav-signin"
        >
          Sign In
        </Link>
      </nav>

      {/* ── Main card ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[900px]">
          {/* Outer glass layers (stacked cards behind) */}
          <div className="relative">
            <div className="absolute -bottom-3 left-3 right-3 h-full rounded-3xl border border-white/30 bg-white/20 backdrop-blur-md" />
            <div className="absolute -bottom-1.5 left-1.5 right-1.5 h-full rounded-3xl border border-white/40 bg-white/30 backdrop-blur-md" />

            {/* Main card */}
            <div className="relative grid overflow-hidden rounded-3xl border border-white/50 bg-white/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
              {/* ── Left red panel ── */}
              <div className="relative flex flex-col justify-center overflow-hidden bg-brand-600 px-8 py-12 sm:px-12 md:py-16">
                {/* Curved shape overlay */}
                <div className="absolute -right-20 -top-20 h-[200%] w-[60%] rounded-[50%] bg-white/5" />
                <div className="absolute -right-10 bottom-0 top-0 w-[40%]">
                  <svg
                    viewBox="0 0 200 600"
                    fill="none"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M 80 0 Q 0 300 80 600 L 200 600 L 200 0 Z"
                      fill="white"
                      fillOpacity="0.07"
                    />
                  </svg>
                </div>

                {/* Logo */}
                <div className="relative mb-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <Utensils className="h-7 w-7 text-white" />
                  </div>
                </div>

                {/* Welcome text */}
                <h1 className="relative text-4xl font-bold leading-tight text-white sm:text-5xl">
                  Welcome
                  <br />
                  Back!
                </h1>
                <p className="relative mt-4 max-w-xs text-base leading-relaxed text-white/80">
                  Sign in to continue managing your food-tech business.
                </p>

                {/* Glass sign-in button */}
                <div className="relative mt-8">
                  <Link
                    href="/signup"
                    className="inline-flex rounded-full border border-white/30 bg-white/20 px-8 py-3 text-sm font-semibold tracking-wider text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30 hover:shadow-lg"
                    id="login-left-signup"
                  >
                    SIGN UP
                  </Link>
                </div>
              </div>

              {/* ── Right form panel ── */}
              <div className="flex flex-col justify-center px-8 py-10 sm:px-12 md:py-14">
                <h2 className="text-2xl font-bold text-neutral-900 sm:text-[1.65rem]">
                  Login to Your Account
                </h2>

                {/* Social login */}
                <div className="mt-6 flex items-center gap-3">
                  {/* Google */}
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                    type="button"
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:border-neutral-300 hover:shadow-md disabled:opacity-50"
                    id="login-google"
                    aria-label="Sign in with Google"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </button>

                  {/* Apple */}
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:border-neutral-300 hover:shadow-md"
                    id="login-apple"
                    aria-label="Sign in with Apple"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </button>

                  {/* LinkedIn */}
                  <button
                    className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white transition-all duration-200 hover:border-neutral-300 hover:shadow-md"
                    id="login-linkedin"
                    aria-label="Sign in with LinkedIn"
                  >
                    <svg className="h-5 w-5 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-neutral-200" />
                  <span className="text-xs text-neutral-400">or</span>
                  <div className="h-px flex-1 bg-neutral-200" />
                </div>

                {errorMsg && (
                  <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
                    {errorMsg}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      id="login-email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 py-3 pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="login-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 py-3 pl-10 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 transition-all duration-200 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
                      id="login-toggle-password"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Remember me + Forgot */}
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                        id="login-remember"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(true)}
                      className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                      id="login-forgot"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full bg-gradient-to-r from-brand-600 to-orange-500 py-3.5 text-sm font-bold tracking-wider text-white shadow-lg transition-all duration-300 hover:from-brand-700 hover:to-orange-600 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                    id="login-submit"
                  >
                    {isSubmitting ? "SIGNING IN..." : "SIGN IN"}
                  </button>
                </form>

                {/* Sign up link */}
                <p className="mt-5 text-center text-sm text-neutral-500">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
                    id="login-signup-link"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom links ── */}
      <footer className="relative z-10 flex items-center justify-center gap-6 px-4 py-5">
        <Link href="#" className="text-sm text-neutral-400 transition-colors hover:text-neutral-600">
          Terms
        </Link>
        <Link href="#" className="text-sm text-neutral-400 transition-colors hover:text-neutral-600">
          Privacy
        </Link>
        <Link href="#" className="text-sm text-neutral-400 transition-colors hover:text-neutral-600">
          Contact Support
        </Link>
      </footer>
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}
