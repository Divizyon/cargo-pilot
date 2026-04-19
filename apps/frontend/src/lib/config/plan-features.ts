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
