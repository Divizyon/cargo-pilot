import { create } from 'zustand';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

interface SubscriptionStore {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  willCancelAtPeriodEnd: boolean;
  setPlan: (
    plan: SubscriptionPlan,
    expiresAt?: string | null,
    willCancelAtPeriodEnd?: boolean,
  ) => void;
  setWillCancelAtPeriodEnd: (value: boolean) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  plan: 'free',
  expiresAt: null,
  willCancelAtPeriodEnd: false,
  setPlan: (plan, expiresAt = null, willCancelAtPeriodEnd = false) =>
    set({ plan, expiresAt, willCancelAtPeriodEnd }),
  setWillCancelAtPeriodEnd: (willCancelAtPeriodEnd) => set({ willCancelAtPeriodEnd }),
  clear: () => set({ plan: 'free', expiresAt: null, willCancelAtPeriodEnd: false }),
}));

export function selectIsSubscriptionExpired(state: SubscriptionStore): boolean {
  return (
    state.willCancelAtPeriodEnd &&
    state.expiresAt !== null &&
    new Date(state.expiresAt) < new Date()
  );
}
