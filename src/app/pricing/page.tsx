"use client";

import React, { useState } from "react";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { CheckCircle2, Star, Zap, Building } from "lucide-react";
import { usePlan } from "@/store/authStore";
import { PLAN_PRICING } from "@/config/plans";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  type PlanType = { name: string; id: string; icon: any; price: string; description: string; features: string[]; current: boolean; buttonText: string; popular?: boolean; betaFree?: boolean; originalPrice?: number; };
  const plans: PlanType[] = [
    {
      name: "Starter",
      id: "starter",
      icon: Star,
      price: billingCycle === 'monthly' ? PLAN_PRICING.starter.price.toString() : (PLAN_PRICING.starter.price * 10).toString(),
      description: "Perfect for small food stalls and cafes starting their digital journey.",
      features: [
        "1 Workspace",
        "Up to 50 Menu Items",
        "Digital QR Menu",
        "Up to 5 Staff Accounts",
        "Email Support"
      ],
      current: false,
      buttonText: "Subscribe to Starter"
    },
    {
      name: "Growth",
      id: "growth",
      icon: Zap,
      price: billingCycle === 'monthly' ? PLAN_PRICING.growth.price.toString() : (PLAN_PRICING.growth.price * 10).toString(),
      betaFree: false,
      description: "Ideal for growing restaurants with multiple staff members.",
      features: [
        "Up to 3 Workspaces",
        "Unlimited Menu Items",
        "Live Kitchen Display",
        "Up to 12 Staff Accounts",
        "Priority Support"
      ],
      current: false,
      buttonText: "Subscribe to Growth",
      popular: true
    },
    {
      name: "Pro",
      id: "pro",
      icon: Building,
      price: billingCycle === 'monthly' ? PLAN_PRICING.pro.price.toString() : (PLAN_PRICING.pro.price * 10).toString(),
      description: "For established businesses and multi-chain restaurants.",
      features: [
        "Unlimited Workspaces",
        "Unlimited Staff Accounts",
        "Advanced Analytics & Export",
        "Custom Domain Support",
        "24/7 Dedicated Support"
      ],
      current: false,
      buttonText: "Upgrade to Pro"
    }
  ];

  const { plan: currentPlan, isTrialExpired, subStatus } = usePlan();

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1200px] px-8 py-12 pb-24 text-center">
        {isTrialExpired && subStatus === 'trial' ? (
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-red-600 tracking-tight mb-4">Your 14-Day Growth Trial Has Ended</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto text-lg font-medium">
              Choose a plan to continue using TakeaBite.
            </p>
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-neutral-900 tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto">
              Choose the plan that best fits your business needs. Upgrade or downgrade at any time.
            </p>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="bg-white border border-neutral-200 p-1 rounded-full inline-flex shadow-sm relative">
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Monthly Billing
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-white' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              Yearly Billing
              <span className="absolute -top-3 -right-3 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200">Save 20%</span>
            </button>
            {/* Sliding Background */}
            <div 
              className={`absolute top-1 bottom-1 w-1/2 bg-brand-600 rounded-full shadow transition-transform duration-300 ease-in-out ${billingCycle === 'yearly' ? 'translate-x-full left-[-4px]' : 'translate-x-0 left-1'}`}
            ></div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {plans.map((plan, idx) => (
            <div 
              key={idx} 
              className={`relative flex flex-col bg-white rounded-3xl p-8 border-2 transition-all duration-300 ${plan.popular ? 'border-brand-500 shadow-xl shadow-brand-500/10 scale-105' : 'border-neutral-200 shadow-sm hover:border-brand-300'}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                  Most Popular
                </div>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${plan.popular ? 'bg-brand-50 text-brand-600' : 'bg-neutral-100 text-neutral-600'}`}>
                  <plan.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
              </div>
              
              <div className="mb-4">
                {plan.betaFree && (
                  <div className="text-brand-600 font-bold text-sm mb-1 uppercase tracking-wider">Free during Beta</div>
                )}
                {plan.originalPrice && (
                  <span className="text-xl font-medium text-neutral-400 line-through mr-2">₹{plan.originalPrice}</span>
                )}
                <span className="text-4xl font-extrabold text-neutral-900">₹{plan.price}</span>
                <span className="text-neutral-500 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
              
              <p className="text-sm text-neutral-500 mb-8 min-h-[40px]">{plan.description}</p>
              
              <div className="space-y-4 flex-1 mb-8">
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-brand-500' : 'text-neutral-400'}`} />
                    <span className="text-sm text-neutral-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              
              <button 
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-colors ${
                  plan.id === currentPlan && !isTrialExpired
                    ? 'bg-neutral-100 text-neutral-600 border border-neutral-200 cursor-default' 
                    : plan.popular
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm'
                      : 'bg-white border-2 border-neutral-200 hover:border-brand-600 text-neutral-700 hover:text-brand-600'
                }`}
              >
                {plan.id === currentPlan && !isTrialExpired ? 'Current Plan' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </OwnerLayout>
  );
}
