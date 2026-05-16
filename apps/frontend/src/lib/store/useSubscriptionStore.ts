import { create } from 'zustand';

export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'enterprise';

export interface SubscriptionUsage {
  plansUsed: number;
  plansLimit: number | null;
  vehiclesCount: number;
  vehiclesLimit: number | null;
  productsCount: number;
  productsLimit: number | null;
  renewalDate: string | null;
}

export interface SavedCardInfo {
  last4: string;
  network: 'visa' | 'mastercard' | 'amex' | 'troy' | null;
  cardholderName: string;
  expiry: string;
}

interface SubscriptionStore {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  pendingDowngradePlan: SubscriptionPlan | null;
  pendingDowngradeDate: string | null;
  customerId: string | null;
  nextBillingDate: string | null;
  usage: SubscriptionUsage | null;
  savedCard: SavedCardInfo | null;
  setPlan: (plan: SubscriptionPlan, expiresAt?: string | null) => void;
  setUsage: (usage: SubscriptionUsage) => void;
  setCancellation: (cancelAtPeriodEnd: boolean) => void;
  setPendingDowngrade: (plan: SubscriptionPlan | null, date: string | null) => void;
  setCustomerId: (id: string | null) => void;
  setNextBillingDate: (date: string | null) => void;
  setSavedCard: (card: SavedCardInfo | null) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()((set) => ({
  plan: 'free',
  expiresAt: null,
  cancelAtPeriodEnd: false,
  pendingDowngradePlan: null,
  pendingDowngradeDate: null,
  customerId: null,
  nextBillingDate: null,
  usage: null,
  savedCard: null,
  setPlan: (plan: SubscriptionPlan, expiresAt: string | null = null) => set({ plan, expiresAt }),
  setUsage: (usage: SubscriptionUsage) => set({ usage }),
  setCancellation: (cancelAtPeriodEnd: boolean) => set({ cancelAtPeriodEnd }),
  setPendingDowngrade: (
    pendingDowngradePlan: SubscriptionPlan | null,
    pendingDowngradeDate: string | null,
  ) => set({ pendingDowngradePlan, pendingDowngradeDate }),
  setCustomerId: (customerId: string | null) => set({ customerId }),
  setNextBillingDate: (nextBillingDate: string | null) => set({ nextBillingDate }),
  setSavedCard: (savedCard) => set({ savedCard }),
  clear: () =>
    set({
      plan: 'free',
      expiresAt: null,
      cancelAtPeriodEnd: false,
      pendingDowngradePlan: null,
      pendingDowngradeDate: null,
      customerId: null,
      nextBillingDate: null,
      usage: null,
      savedCard: null,
    }),
}));
