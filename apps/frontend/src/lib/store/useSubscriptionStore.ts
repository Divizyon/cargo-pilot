import { create } from 'zustand';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

interface SubscriptionStore {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  pendingPlan: SubscriptionPlan | null;
  pendingAt: string | null;
  setPlan: (plan: SubscriptionPlan, expiresAt?: string | null) => void;
  setPendingDowngrade: (plan: SubscriptionPlan, at: string) => void;
  clearPending: () => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  plan: 'free',
  expiresAt: null,
  pendingPlan: null,
  pendingAt: null,
  setPlan: (plan, expiresAt = null) => set({ plan, expiresAt }),
  setPendingDowngrade: (pendingPlan, pendingAt) => set({ pendingPlan, pendingAt }),
  clearPending: () => set({ pendingPlan: null, pendingAt: null }),
  clear: () => set({ plan: 'free', expiresAt: null, pendingPlan: null, pendingAt: null }),
}));
