import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';
import { useAuthStore } from '@/lib/store/useAuthStore';
import {
  planListApiResponseSchema,
  planListApiItemSchema,
  extractListData,
  fromApiPlanListItem,
} from './loadingPlanMappers';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';

const apiResponseSchema = z.object({
  isSuccess: z.boolean(),
  data: z.object({
    vehicleEfficiency: z.number(),
    totalLoadedTonnage: z.number(),
    totalLoadingCount: z.number(),
  }),
});

export type WeeklyTrendItem = { day: string; sevkiyat: number; teslim: number };
export type StatCard = { value: number; subInfo: string; delta: number };

export type DashboardStatsData = {
  vehicleEfficiency: StatCard;
  weeklyLoadedTonnage: StatCard;
  weeklyLoadingCount: StatCard;
  weeklyTrend: WeeklyTrendItem[];
};

export const WEEKLY_TREND_PLACEHOLDER: WeeklyTrendItem[] = [
  { day: 'Pzt', sevkiyat: 0, teslim: 0 },
  { day: 'Sal', sevkiyat: 0, teslim: 0 },
  { day: 'Çar', sevkiyat: 0, teslim: 0 },
  { day: 'Per', sevkiyat: 0, teslim: 0 },
  { day: 'Cum', sevkiyat: 0, teslim: 0 },
  { day: 'Cmt', sevkiyat: 0, teslim: 0 },
  { day: 'Paz', sevkiyat: 0, teslim: 0 },
];

async function fetchDashboardStats(): Promise<DashboardStatsData> {
  const { data } = await axiosInstance.get('/api/v1/loading-plans/stats');
  const parsed = apiResponseSchema.parse(data);

  return {
    vehicleEfficiency: {
      value: Math.round(parsed.data.vehicleEfficiency),
      subInfo: 'Bu haftanın ortalama araç doluluk oranı',
      delta: 0,
    },
    weeklyLoadedTonnage: {
      value: parsed.data.totalLoadedTonnage,
      subInfo: 'Bu hafta yüklenen toplam tonaj',
      delta: 0,
    },
    weeklyLoadingCount: {
      value: parsed.data.totalLoadingCount,
      subInfo: 'Bu hafta gerçekleşen yükleme',
      delta: 0,
    },
    weeklyTrend: WEEKLY_TREND_PLACEHOLDER,
  };
}

/**
 * Panel verisi her pencere odağında yeniden çekilmesin diye kısa bir tazelik
 * süresi tanımlanır; `staleTime: 0` ile her sekme dönüşü tüm sorguları
 * tetikliyordu.
 */
export const DASHBOARD_STALE_TIME = 60 * 1000;

/** Backend `GetPlansQueryValidator` sayfa boyutunu 1-100 ile sınırlar. */
const WEEKLY_TREND_PAGE_SIZE = 100;

export function useDashboardStats() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['dashboard-stats', userId] as const,
    queryFn: fetchDashboardStats,
    staleTime: DASHBOARD_STALE_TIME,
    enabled: Boolean(userId),
  });
}

async function fetchLoadingPlans(params: Record<string, unknown>): Promise<LoadingPlanListItem[]> {
  const { data } = await axiosInstance.get<unknown>('/api/v1/loading-plans', { params });
  const parsed = planListApiResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  const { rawItems } = extractListData(parsed.data);
  const results: LoadingPlanListItem[] = [];
  for (const raw of rawItems) {
    const p = planListApiItemSchema.safeParse(raw);
    if (p.success) results.push(fromApiPlanListItem(p.data));
  }
  return results;
}

/**
 * Panelin son planlar listesi. `select` ile aynı sorgudan farklı görünümler
 * türetilebilir; ayrı bir anahtarla aynı isteği ikinci kez atmaya gerek yoktur.
 */
export function useDashboardPlans<TData = LoadingPlanListItem[]>(
  select?: (plans: LoadingPlanListItem[]) => TData,
) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['dashboard-plans', userId] as const,
    queryFn: () =>
      fetchLoadingPlans({ page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' }),
    select,
    staleTime: DASHBOARD_STALE_TIME,
    enabled: Boolean(userId),
  });
}

export function useWeeklyTrendPlans() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ['weekly-trend-plans', userId] as const,
    queryFn: () => {
      const now = new Date();
      const sixDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return fetchLoadingPlans({
        page: 1,
        // Backend sayfa boyutunu 1-100 ile sınırlıyor; daha büyük değer 400 döner.
        pageSize: WEEKLY_TREND_PAGE_SIZE,
        sortBy: 'createdAt',
        sortDirection: 'desc',
        startDate: sixDaysAgo.toISOString(),
      });
    },
    staleTime: DASHBOARD_STALE_TIME,
    enabled: Boolean(userId),
  });
}
