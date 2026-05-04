import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore } from '@/lib/store/useAuthStore';

export const recentPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
  snapshotUrl: z.string().url().nullable().optional(),
});

const recentPlansResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.array(recentPlanSchema),
});

export type RecentPlan = z.infer<typeof recentPlanSchema>;

async function fetchRecentPlans(): Promise<RecentPlan[]> {
  const { data } = await axiosInstance.get<unknown>('/api/v1/loading-plans/recent', {
    params: { limit: 7, sort: 'createdAt:desc' },
  });
  return recentPlansResponseSchema.parse(data).data;
}

export function useRecentPlans() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['plans', userId, { limit: 7, sort: 'createdAt:desc' }] as const,
    queryFn: fetchRecentPlans,
    staleTime: 2 * 60 * 1000,
    retry: false,
    enabled: false, // endpoint henüz backend'de yok
  });
}
