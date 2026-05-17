import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/api/axiosInstance';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  planListApiResponseSchema,
  planListApiItemSchema,
  extractListData,
  fromApiPlanListItem,
} from '@/lib/api/loadingPlanMappers';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';

export type RecentPlan = LoadingPlanListItem;

async function fetchRecentPlans(): Promise<LoadingPlanListItem[]> {
  const { data } = await axiosInstance.get<unknown>('/api/v1/loading-plans', {
    params: { page: 1, pageSize: 7, sortBy: 'createdAt', sortDirection: 'desc' },
  });
  const parsed = planListApiResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  const { rawItems } = extractListData(parsed.data);
  const results: LoadingPlanListItem[] = [];
  for (const raw of rawItems.slice(0, 7)) {
    const p = planListApiItemSchema.safeParse(raw);
    if (!p.success) continue;
    results.push(fromApiPlanListItem(p.data));
  }
  return results;
}

export function useRecentPlans() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['recent-plans', userId] as const,
    queryFn: fetchRecentPlans,
    staleTime: 2 * 60 * 1000,
    retry: false,
    enabled: Boolean(userId),
  });
}
