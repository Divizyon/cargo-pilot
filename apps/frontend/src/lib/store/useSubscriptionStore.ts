import { create } from 'zustand';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

interface SubscriptionStore {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  setPlan: (plan: SubscriptionPlan, expiresAt?: string | null) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  plan: 'free',
  expiresAt: null,
  setPlan: (plan, expiresAt = null) => set({ plan, expiresAt }),
  clear: () => set({ plan: 'free', expiresAt: null }),
}));
