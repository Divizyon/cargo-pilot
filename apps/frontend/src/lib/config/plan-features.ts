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
