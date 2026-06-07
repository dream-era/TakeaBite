"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Workflow,
  Users,
  CreditCard,
  PlayCircle,
  Utensils,
} from "lucide-react";

const floatingCards = [
  {
    icon: QrCode,
    title: "QR Ordering",
    description: "Seamless digital menus & ordering",
    position: "top-left" as const,
  },
  {
    icon: Workflow,
    title: "Real-time Workflow",
    description: "Optimize order routing & preparation",
    position: "top-right" as const,
  },
  {
    icon: Users,
    title: "Staff Coordination",
    description: "Empower teams with real-time alerts",
    position: "bottom-left" as const,
  },
  {
    icon: CreditCard,
    title: "Instant Payments",
    description: "Secure, fast payment integration",
    position: "bottom-right" as const,
  },
];

const positionClasses: Record<string, string> = {
  "top-left": "left-0 top-4 sm:left-4 md:-left-4 lg:left-0",
  "top-right": "right-0 top-0 sm:right-4 md:-right-4 lg:right-0",
  "bottom-left": "left-0 bottom-4 sm:left-4 md:-left-8 lg:left-0",
  "bottom-right": "right-0 bottom-0 sm:right-4 md:-right-4 lg:right-0",
};

const animationClasses: Record<string, string> = {
  "top-left": "animate-float",
  "top-right": "animate-float-delayed",
  "bottom-left": "animate-float-slow",
  "bottom-right": "animate-float",
};


export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-b from-white via-brand-50/30 to-white pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24"
    >
      {/* Subtle background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-100/30 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-red-50/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Floating cards orbiting the center logo */}
        <div className="relative mx-auto mb-12 h-[320px] w-full max-w-[540px] sm:mb-16 sm:h-[360px] lg:h-[400px]">
          {/* Orbit rings */}
          <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 orbit-ring sm:h-[280px] sm:w-[280px] lg:h-[320px] lg:w-[320px]" />
          <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 orbit-ring sm:h-[420px] sm:w-[420px] lg:h-[480px] lg:w-[480px]" />

          {/* Center logo */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-800 shadow-hero animate-pulse-soft sm:h-20 sm:w-20">
              <Utensils className="h-8 w-8 text-white sm:h-10 sm:w-10" />
            </div>
          </div>

          {/* Floating feature cards */}
          {floatingCards.map((card, i) => (
            <div
              key={card.title}
              className={`absolute ${positionClasses[card.position]} ${animationClasses[card.position]} z-10`}
              style={{ animationDelay: `${i * 0.5}s` }}
            >
              <div className="hero-float-card flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <card.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {card.title}
                  </p>
                  <p className="text-xs text-neutral-500">{card.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            Transform Your Business
            <br />
            <span className="gradient-text">Into a Smart Digital Experience</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-500 sm:mt-6 sm:text-lg">
            TakeaBite is the all-in-one premium SaaS platform to digitize
            operations and streamline workflows for modern businesses.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" asChild id="hero-cta-primary">
              <Link href="/login">Start Your Digital Store</Link>
            </Button>
            <Button variant="outline" size="lg" id="hero-cta-secondary">
              <PlayCircle className="mr-2 h-5 w-5" />
              Watch Live Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
