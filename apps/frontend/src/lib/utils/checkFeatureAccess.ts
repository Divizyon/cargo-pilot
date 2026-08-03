import { useSubscriptionStore, type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';
import { PLAN_FEATURES, PLAN_ORDER, type FeatureKey } from '@/lib/config/plan-features';

function planRank(plan: SubscriptionPlan): number {
  return PLAN_ORDER.indexOf(plan);
}

export function hasFeatureAccess(plan: SubscriptionPlan, feature: FeatureKey): boolean {
  const required = PLAN_FEATURES[feature];
  return planRank(plan) >= planRank(required);
}

export function checkFeatureAccess(feature: FeatureKey): boolean {
  const { plan } = useSubscriptionStore.getState();
  return hasFeatureAccess(plan, feature);
}

export function getRequiredPlan(feature: FeatureKey): SubscriptionPlan {
  return PLAN_FEATURES[feature];
}

export function isSubscriptionExpired(): boolean {
  const { expiresAt, plan } = useSubscriptionStore.getState();
  if (plan === 'free') return false;
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
