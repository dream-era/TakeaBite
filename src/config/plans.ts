import { Restaurant } from '@/types/database';

export type SubscriptionPlan = 'starter' | 'growth' | 'pro';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export const TRIAL_DURATION_DAYS = 14;

export const PLAN_LIMITS = {
  starter: {
    workspaces: 1,
    menuItems: 50,
    staffAccounts: 5,
  },
  growth: {
    workspaces: 3,
    menuItems: Infinity,
    staffAccounts: 12,
  },
  pro: {
    workspaces: Infinity,
    menuItems: Infinity,
    staffAccounts: Infinity,
  },
} as const;

export const PLAN_FEATURES = {
  starter: {
    hasLiveKitchen: false,
    hasAdvancedAnalytics: false,
    hasCustomDomain: false,
    hasPrioritySupport: false,
  },
  growth: {
    hasLiveKitchen: true,
    hasAdvancedAnalytics: false,
    hasCustomDomain: false,
    hasPrioritySupport: true,
  },
  pro: {
    hasLiveKitchen: true,
    hasAdvancedAnalytics: true,
    hasCustomDomain: true,
    hasPrioritySupport: true,
  },
} as const;

export const PLAN_PRICING = {
  starter: {
    price: 299,
    label: 'Starter',
  },
  growth: {
    price: 999,
    label: 'Growth',
  },
  pro: {
    price: 2999,
    label: 'Pro',
  },
} as const;

// Helper Functions

export function isTrialExpired(restaurant: Pick<Restaurant, 'sub_status' | 'trial_end_date'>): boolean {
  if (restaurant.sub_status !== 'trial') return false;
  if (!restaurant.trial_end_date) return false;
  
  return new Date() > new Date(restaurant.trial_end_date);
}

export function getTrialDaysRemaining(restaurant: Pick<Restaurant, 'sub_status' | 'trial_end_date'>): number {
  if (restaurant.sub_status !== 'trial' || !restaurant.trial_end_date) return 0;
  
  const now = new Date();
  const endDate = new Date(restaurant.trial_end_date);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

export function hasFeatureAccess(
  restaurant: Pick<Restaurant, 'current_plan' | 'sub_status' | 'trial_end_date'>, 
  feature: keyof typeof PLAN_FEATURES['starter']
): boolean {
  // If trial expired, only starter features are allowed
  if (isTrialExpired(restaurant)) {
    return PLAN_FEATURES['starter'][feature];
  }
  
  return PLAN_FEATURES[restaurant.current_plan as SubscriptionPlan][feature] ?? false;
}

export function getLimit(
  restaurant: Pick<Restaurant, 'current_plan' | 'sub_status' | 'trial_end_date'>,
  limitType: keyof typeof PLAN_LIMITS['starter']
): number {
  // If trial expired, fall back to Starter limits to prevent new creation
  if (isTrialExpired(restaurant)) {
    return PLAN_LIMITS['starter'][limitType];
  }
  
  return PLAN_LIMITS[restaurant.current_plan as SubscriptionPlan][limitType];
}
