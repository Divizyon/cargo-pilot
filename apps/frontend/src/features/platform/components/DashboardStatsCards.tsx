import { useMemo } from 'react';
import { Gauge, Scale, ClipboardList } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDashboardStats,
  useDashboardPlans,
  useWeeklyTrendPlans,
  WEEKLY_TREND_PLACEHOLDER,
} from '@/lib/api/useDashboardStats';
import { useVehicles } from '@/lib/api/useVehicles';
import { PlanStatus, type LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { StatSummaryCard } from './StatSummaryCard';
import { WeeklyTrendChart } from './WeeklyTrendChart';

const efficiencyFormat = (v: number) => `%${Number.isFinite(v) ? Math.round(v) : 0}`;
const tonnageFormat = (v: number) => `${new Intl.NumberFormat('tr-TR').format(v)} ton`;

function computeWeeklyTrend(items: { createdAt: string }[]) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const plan of items) {
    const date = new Date(plan.createdAt);
    if (isNaN(date.getTime())) continue;
    const diff = Math.floor((date.getTime() - monday.getTime()) / 86400000);
    if (diff >= 0 && diff < 7) counts[diff]++;
  }

  return dayLabels.map((day, i) => ({ day, sevkiyat: counts[i], teslim: 0 }));
}

export function DashboardStatsCards() {
  const { data, isLoading, isError } = useDashboardStats();
  const { data: allPlans } = useDashboardPlans();
  const { data: weeklyPlans } = useWeeklyTrendPlans();
  const { data: vehiclesData } = useVehicles({ pageSize: 1 });
  const queryClient = useQueryClient();

  function handleRetry() {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }

  // Her iki API kaynağını (allPlans pageSize:10 + weeklyPlans pageSize:200) id bazlı birleştir.
  // weeklyPlans yalnızca kısmi veri döndürebilir (startDate filtresi farklı çalışabilir);
  // allPlans ise en güncel 10 planı garantili getirir. İkisini birleştirmek en doğru sonucu verir.
  const effectivePlans = useMemo(() => {
    const combined = new Map<string, LoadingPlanListItem>();
    for (const p of allPlans ?? []) combined.set(p.id, p);
    for (const p of weeklyPlans ?? []) combined.set(p.id, p);
    return [...combined.values()];
  }, [allPlans, weeklyPlans]);

  const weeklyFilteredItems = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return effectivePlans.filter((p) => {
      const d = new Date(p.createdAt);
      return !isNaN(d.getTime()) && d >= monday;
    });
  }, [effectivePlans]);

  const taslakCount = weeklyFilteredItems.filter((p) => p.status === PlanStatus.Taslak).length;
  const tamamlandiCount = weeklyFilteredItems.filter(
    (p) => p.status === PlanStatus.Tamamlandi,
  ).length;

  const weeklyEfficiency = useMemo(() => {
    const totalVehicles = vehiclesData?.totalCount ?? 0;
    if (totalVehicles === 0) return 0;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const thisWeekPlans = effectivePlans.filter((p) => {
      const d = new Date(p.createdAt);
      if (isNaN(d.getTime())) return false;
      const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
      return diff >= 0 && diff < 7;
    });
    const uniqueVehicleCount = new Set(thisWeekPlans.map((p) => p.vehicleId)).size;
    return Math.round((uniqueVehicleCount / totalVehicles) * 100);
  }, [effectivePlans, vehiclesData]);

  const trendData = useMemo(() => {
    return effectivePlans.length > 0
      ? computeWeeklyTrend(effectivePlans)
      : WEEKLY_TREND_PLACEHOLDER;
  }, [effectivePlans]);

  const vehicleSubInfo =
    vehiclesData !== undefined
      ? `${vehiclesData.totalCount} araç tanımlı`
      : (data?.vehicleEfficiency.subInfo ?? '');

  const planStatusFooter = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-amber-400 shrink-0" />
        {taslakCount} Taslak
      </span>
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-blue-500 shrink-0" />
        {tamamlandiCount} Tamamlandı
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatSummaryCard
          title="Bu Hafta Araç Verimliliği"
          icon={Gauge}
          value={weeklyEfficiency}
          subInfo={vehicleSubInfo}
          delta={0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          formatValue={efficiencyFormat}
        />
        <StatSummaryCard
          title="Bu Hafta Yüklenen Tonaj"
          icon={Scale}
          value={data?.weeklyLoadedTonnage.value ?? 0}
          subInfo={data?.weeklyLoadedTonnage.subInfo ?? ''}
          delta={data?.weeklyLoadedTonnage.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          formatValue={tonnageFormat}
        />
        <StatSummaryCard
          title="Bu Hafta Yükleme Sayısı"
          icon={ClipboardList}
          value={weeklyFilteredItems.length}
          subInfo=""
          delta={0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          footer={planStatusFooter}
        />
      </div>

      <WeeklyTrendChart data={trendData} />
    </div>
  );
}
