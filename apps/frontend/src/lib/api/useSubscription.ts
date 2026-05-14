import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import { type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';

const purchaseResponseSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  expiresAt: z.string().nullable(),
});

export type Purchaseableplan = Exclude<SubscriptionPlan, 'free' | 'enterprise'>;

export type SubscriptionPurchasePayload = {
  planKey: Purchaseableplan;
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

export type PurchaseResponse = z.infer<typeof purchaseResponseSchema>;

export function usePurchaseSubscription() {
  return useMutation({
    mutationFn: async (payload: SubscriptionPurchasePayload) => {
      const res = await axiosInstance.post('/subscriptions/purchase', payload);
      return purchaseResponseSchema.parse(res.data);
    },
  });
}
