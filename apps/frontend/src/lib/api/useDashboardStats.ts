import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/lib/store/useAuthStore';

const weeklyTrendItemSchema = z.object({
  day: z.string(),
  sevkiyat: z.number(),
  teslim: z.number(),
});

const statCardSchema = z.object({
  value: z.number(),
  subInfo: z.string(),
  delta: z.number(),
});

const dashboardStatsSchema = z.object({
  weeklyLoadingCount: statCardSchema,
  vehicleEfficiency: statCardSchema,
  weeklyLoadedTonnage: statCardSchema,
  weeklyTrend: z.array(weeklyTrendItemSchema),
});

export type DashboardStatsData = z.infer<typeof dashboardStatsSchema>;
export type WeeklyTrendItem = z.infer<typeof weeklyTrendItemSchema>;
export type StatCard = z.infer<typeof statCardSchema>;

const MOCK_DATA: DashboardStatsData = {
  weeklyLoadingCount: { value: 158, subInfo: 'Bu hafta gerçekleşen yükleme', delta: 12 },
  vehicleEfficiency: { value: 87, subInfo: "34 araçtan 30'u aktif sahada", delta: 5 },
  weeklyLoadedTonnage: { value: 1840, subInfo: 'Haftalık hedef: 2.000 ton', delta: 8 },
  weeklyTrend: [
    { day: 'Pzt', sevkiyat: 120, teslim: 95 },
    { day: 'Sal', sevkiyat: 145, teslim: 110 },
    { day: 'Çar', sevkiyat: 98, teslim: 88 },
    { day: 'Per', sevkiyat: 167, teslim: 142 },
    { day: 'Cum', sevkiyat: 189, teslim: 165 },
    { day: 'Cmt', sevkiyat: 76, teslim: 62 },
    { day: 'Paz', sevkiyat: 45, teslim: 38 },
  ],
};

export function useDashboardStats() {
  const companyId = useAuthStore((s) => s.user?.id ?? 'guest');
  return useQuery({
    queryKey: ['dashboard-stats', companyId] as const,
    queryFn: (): DashboardStatsData => dashboardStatsSchema.parse(MOCK_DATA),
    staleTime: 5 * 60 * 1000,
  });
}
