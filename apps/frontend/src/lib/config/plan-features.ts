import type { SubscriptionPlan } from '@/lib/store/useSubscriptionStore';

export const PLAN_ORDER: SubscriptionPlan[] = ['free', 'starter', 'pro', 'enterprise'];

export const PLAN_FEATURES = {
  bulkImport: 'starter',
  pdfExport: 'starter',
  excelExport: 'starter',
  manualPlacement: 'pro',
  advanced3D: 'pro',
  multiUser: 'pro',
  erpIntegration: 'enterprise',
  apiAccess: 'enterprise',
} as const satisfies Record<string, SubscriptionPlan>;

export type FeatureKey = keyof typeof PLAN_FEATURES;

export const PLAN_MAX_MEMBERS: Record<SubscriptionPlan, number> = {
  free: 1,
  starter: 5,
  pro: 25,
  enterprise: Number.MAX_SAFE_INTEGER,
};

export interface PlanLimits {
  maxPlansPerMonth: number | null;
  maxVehicles: number | null;
  maxProducts: number | null;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: { maxPlansPerMonth: 3, maxVehicles: 1, maxProducts: 50 },
  starter: { maxPlansPerMonth: 30, maxVehicles: 5, maxProducts: 500 },
  pro: { maxPlansPerMonth: null, maxVehicles: null, maxProducts: null },
  enterprise: { maxPlansPerMonth: null, maxVehicles: null, maxProducts: null },
};

export const PLAN_PRICES: Record<Exclude<SubscriptionPlan, 'enterprise'>, number> = {
  free: 0,
  starter: 499,
  pro: 1299,
};
