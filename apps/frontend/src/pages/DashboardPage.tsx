import { useState } from 'react';
import { DashboardGreeting } from '@/features/platform/components/DashboardGreeting';
import { DashboardStatsCards } from '@/features/platform/components/DashboardStatsCards';
import { DashboardRecentPlans } from '@/features/platform/components/DashboardRecentPlans';
import { OnboardingDialog } from '@/features/platform/components/OnboardingDialog';
import { useAuthStore } from '@/lib/store/useAuthStore';

function useOnboarding() {
  const user = useAuthStore((s) => s.user);
  const key = user ? `onboarding_done_${user.id}` : null;
  const [open, setOpen] = useState(() => (key ? !localStorage.getItem(key) : false));

  function dismiss() {
    if (key) localStorage.setItem(key, '1');
    setOpen(false);
  }

  return { open, dismiss };
}

export function DashboardPage() {
  const { open, dismiss } = useOnboarding();

  return (
    <div className="space-y-6">
      <DashboardGreeting />
      <DashboardStatsCards />
      <DashboardRecentPlans />
      <OnboardingDialog open={open} onClose={dismiss} />
    </div>
  );
}
