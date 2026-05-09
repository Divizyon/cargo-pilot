import { Gauge, Scale, ClipboardList } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats } from '@/lib/api/useDashboardStats';
import { StatSummaryCard } from './StatSummaryCard';
import { WeeklyTrendChart } from './WeeklyTrendChart';

const efficiencyFormat = (v: number) => `%${v}`;
const tonnageFormat = (v: number) => `${new Intl.NumberFormat('tr-TR').format(v)} ton`;

export function DashboardStatsCards() {
  const { data, isLoading, isError } = useDashboardStats();
  const queryClient = useQueryClient();

  function handleRetry() {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4">
        <StatSummaryCard
          title="Araç Verimliliği"
          icon={Gauge}
          value={data?.vehicleEfficiency.value ?? 0}
          subInfo={data?.vehicleEfficiency.subInfo ?? ''}
          delta={data?.vehicleEfficiency.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          formatValue={efficiencyFormat}
        />
        <StatSummaryCard
          title="Toplam Yüklenen Tonaj"
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
          title="Toplam Yükleme Sayısı"
          icon={ClipboardList}
          value={data?.weeklyLoadingCount.value ?? 0}
          subInfo={data?.weeklyLoadingCount.subInfo ?? ''}
          delta={data?.weeklyLoadingCount.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
        />
      </div>

      {!isError && <WeeklyTrendChart data={data?.weeklyTrend ?? []} />}
    </div>
  );
}
