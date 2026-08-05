import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';

const quotaItemSchema = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().min(0).nullable(),
});

const usageQuotaSchema = z.object({
  plans: quotaItemSchema,
  vehicles: quotaItemSchema,
  products: quotaItemSchema,
  renewsAt: z.string().nullable(),
  scope: z.enum(['user', 'company']),
});

export type UsageQuota = z.infer<typeof usageQuotaSchema>;
export type QuotaItem = z.infer<typeof quotaItemSchema>;

/** Backend `GET /api/v1/me/subscription` yanıtı — limit ve kalan hak alanları. */
const mySubscriptionSchema = z.object({
  maxItemCount: z.number().int(),
  remainingItemCount: z.number().int(),
  maxVehicleCount: z.number().int(),
  remainingVehicleCount: z.number().int(),
  maxLoadingPlanCount: z.number().int(),
  remainingLoadingPlanCount: z.number().int(),
  trialEndsAt: z.string().nullable(),
});

const mySubscriptionResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: mySubscriptionSchema,
});

export function isQuotaExceeded(item: QuotaItem): boolean {
  if (item.limit === null || item.limit === 0) return false;
  return item.used >= item.limit;
}

/** Backend limit + kalan hak döndürür; kullanım = limit - kalan. */
function toQuotaItem(max: number, remaining: number): QuotaItem {
  return { used: Math.max(max - remaining, 0), limit: max };
}

export function useUsageQuota() {
  return useQuery({
    queryKey: ['usage-quota'] as const,
    queryFn: async (): Promise<UsageQuota> => {
      const res = await axiosInstance.get('/api/v1/me/subscription');
      const { data } = mySubscriptionResponseSchema.parse(res.data);
      return usageQuotaSchema.parse({
        plans: toQuotaItem(data.maxLoadingPlanCount, data.remainingLoadingPlanCount),
        vehicles: toQuotaItem(data.maxVehicleCount, data.remainingVehicleCount),
        products: toQuotaItem(data.maxItemCount, data.remainingItemCount),
        renewsAt: data.trialEndsAt,
        scope: 'user',
      });
    },
    staleTime: 2 * 60 * 1000,
  });
}
