import { DashboardGreeting } from '@/features/platform/components/DashboardGreeting';
import { DashboardStatsCards } from '@/features/platform/components/DashboardStatsCards';
import { DashboardPlanWizard } from '@/features/platform/components/DashboardPlanWizard';
import { DashboardRecentPlans } from '@/features/platform/components/DashboardRecentPlans';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardGreeting />
      <DashboardPlanWizard />
      <DashboardStatsCards />
      <DashboardRecentPlans />
    </div>
  );
}
