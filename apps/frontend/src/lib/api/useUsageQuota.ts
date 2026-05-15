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

export function usagePercent(used: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

export function isQuotaExceeded(item: QuotaItem): boolean {
  if (item.limit === null || item.limit === 0) return false;
  return item.used >= item.limit;
}

export function useUsageQuota() {
  return useQuery({
    queryKey: ['usage-quota'],
    queryFn: async () => {
      const res = await axiosInstance.get('/subscriptions/usage');
      return usageQuotaSchema.parse(res.data);
    },
    staleTime: 2 * 60 * 1000,
  });
}
