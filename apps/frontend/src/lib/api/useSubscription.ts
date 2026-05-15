import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import {
  useSubscriptionStore,
  type SubscriptionPlan,
  type SubscriptionUsage,
} from '@/lib/store/useSubscriptionStore';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const subscriptionPlanSchema = z.enum(['free', 'starter', 'pro', 'enterprise']);

const subscriptionUsageSchema = z.object({
  plansUsed: z.number(),
  plansLimit: z.number().nullable(),
  vehiclesCount: z.number(),
  vehiclesLimit: z.number().nullable(),
  productsCount: z.number(),
  productsLimit: z.number().nullable(),
  renewalDate: z.string().nullable(),
});

const subscriptionDetailSchema = z.object({
  plan: subscriptionPlanSchema,
  expiresAt: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  pendingDowngradePlan: subscriptionPlanSchema.nullable(),
  pendingDowngradeDate: z.string().nullable(),
  customerId: z.string().nullable(),
  nextBillingDate: z.string().nullable(),
  usage: subscriptionUsageSchema,
});

const subscriptionResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: subscriptionDetailSchema,
});

const purchaseResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    plan: subscriptionPlanSchema,
    expiresAt: z.string().nullable(),
    customerId: z.string().nullable(),
    nextBillingDate: z.string().nullable(),
  }),
});

const changeResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    plan: subscriptionPlanSchema,
    expiresAt: z.string().nullable(),
    pendingDowngradePlan: subscriptionPlanSchema.nullable(),
    pendingDowngradeDate: z.string().nullable(),
    proratedAmount: z.number().nullable(),
  }),
});

const cancelResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    cancelAtPeriodEnd: z.boolean(),
    expiresAt: z.string().nullable(),
  }),
});

const boolResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.boolean(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseSubscriptionPayload {
  plan: SubscriptionPlan;
  paymentMethodToken: string;
  cardholderName: string;
}

export interface ChangeSubscriptionPayload {
  plan: SubscriptionPlan;
}

export interface ChangeSubscriptionResult {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  pendingDowngradePlan: SubscriptionPlan | null;
  pendingDowngradeDate: string | null;
  proratedAmount: number | null;
}

// ─── useSubscription ──────────────────────────────────────────────────────────

export function useSubscription() {
  const store = useSubscriptionStore();

  return useQuery({
    queryKey: ['subscription'] as const,
    queryFn: async () => {
      const { data: raw } = await axiosInstance.get('/api/v1/subscriptions/me');
      const parsed = subscriptionResponseSchema.parse(raw);
      const d = parsed.data;

      store.setPlan(d.plan, d.expiresAt);
      store.setUsage(d.usage as SubscriptionUsage);
      store.setCancellation(d.cancelAtPeriodEnd);
      store.setPendingDowngrade(d.pendingDowngradePlan, d.pendingDowngradeDate);
      store.setCustomerId(d.customerId);
      store.setNextBillingDate(d.nextBillingDate);

      return d;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ─── usePurchaseSubscription ──────────────────────────────────────────────────

export function usePurchaseSubscription() {
  const queryClient = useQueryClient();
  const store = useSubscriptionStore();

  return useMutation({
    mutationFn: async (payload: PurchaseSubscriptionPayload) => {
      const { data: raw } = await axiosInstance.post('/api/v1/subscriptions/purchase', payload);
      const parsed = purchaseResponseSchema.parse(raw);
      return parsed.data;
    },
    onSuccess: (data) => {
      store.setPlan(data.plan, data.expiresAt);
      if (data.customerId) store.setCustomerId(data.customerId);
      if (data.nextBillingDate) store.setNextBillingDate(data.nextBillingDate);
      store.setCancellation(false);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// ─── useChangeSubscription ────────────────────────────────────────────────────

export function useChangeSubscription() {
  const queryClient = useQueryClient();
  const store = useSubscriptionStore();

  return useMutation({
    mutationFn: async (payload: ChangeSubscriptionPayload): Promise<ChangeSubscriptionResult> => {
      const { data: raw } = await axiosInstance.post('/api/v1/subscriptions/change', payload);
      const parsed = changeResponseSchema.parse(raw);
      return parsed.data;
    },
    onSuccess: (data) => {
      store.setPlan(data.plan, data.expiresAt);
      store.setPendingDowngrade(data.pendingDowngradePlan, data.pendingDowngradeDate);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// ─── useCancelSubscription ────────────────────────────────────────────────────

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  const store = useSubscriptionStore();

  return useMutation({
    mutationFn: async () => {
      const { data: raw } = await axiosInstance.post('/api/v1/subscriptions/cancel');
      const parsed = cancelResponseSchema.parse(raw);
      return parsed.data;
    },
    onSuccess: (data) => {
      store.setCancellation(data.cancelAtPeriodEnd);
      if (data.expiresAt) store.setPlan(store.plan, data.expiresAt);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// ─── useReactivateSubscription ────────────────────────────────────────────────

export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  const store = useSubscriptionStore();

  return useMutation({
    mutationFn: async () => {
      const { data: raw } = await axiosInstance.post('/api/v1/subscriptions/reactivate');
      boolResponseSchema.parse(raw);
    },
    onSuccess: () => {
      store.setCancellation(false);
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}
