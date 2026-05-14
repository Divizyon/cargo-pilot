import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import { type SubscriptionPlan } from '@/lib/store/useSubscriptionStore';

const planChangeResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('upgrade'),
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    expiresAt: z.string().nullable(),
    proratedAmount: z.number(),
  }),
  z.object({
    type: z.literal('downgrade'),
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    pendingPlan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    pendingAt: z.string(),
  }),
]);

export type PlanChangeResponse = z.infer<typeof planChangeResponseSchema>;

export type PlanChangePayload = {
  planKey: SubscriptionPlan;
  direction: 'upgrade' | 'downgrade';
};

export function useChangePlan() {
  return useMutation({
    mutationFn: async (payload: PlanChangePayload) => {
      const res = await axiosInstance.post('/subscriptions/change-plan', payload);
      return planChangeResponseSchema.parse(res.data);
    },
  });
}
