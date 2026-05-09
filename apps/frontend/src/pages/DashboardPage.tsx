import { DashboardGreeting } from '@/features/platform/components/DashboardGreeting';
import { DashboardStatsCards } from '@/features/platform/components/DashboardStatsCards';
import { DashboardRecentPlans } from '@/features/platform/components/DashboardRecentPlans';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />
      <DashboardStatsCards />
      <DashboardRecentPlans />
    </div>
  );
}
