import { Box, Truck, TrendingUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboardStats } from '@/lib/api/useDashboardStats';
import { StatSummaryCard } from './StatSummaryCard';
import { WeeklyTrendChart } from './WeeklyTrendChart';

const ciroFormat = (v: number) => `₺${new Intl.NumberFormat('tr-TR').format(v)}`;

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
          title="Toplam Sevkiyat"
          icon={Box}
          value={data?.totalShipments.value ?? 0}
          subInfo={data?.totalShipments.subInfo ?? ''}
          delta={data?.totalShipments.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
        />
        <StatSummaryCard
          title="Aktif Araç"
          icon={Truck}
          value={data?.activeVehicles.value ?? 0}
          subInfo={data?.activeVehicles.subInfo ?? ''}
          delta={data?.activeVehicles.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
        />
        <StatSummaryCard
          title="Aylık Ciro"
          icon={TrendingUp}
          value={data?.monthlyCiro.value ?? 0}
          subInfo={data?.monthlyCiro.subInfo ?? ''}
          delta={data?.monthlyCiro.delta ?? 0}
          isLoading={isLoading}
          isError={isError}
          onRetry={handleRetry}
          formatValue={ciroFormat}
        />
      </div>

      {!isError && <WeeklyTrendChart data={data?.weeklyTrend ?? []} />}
    </div>
  );
}
