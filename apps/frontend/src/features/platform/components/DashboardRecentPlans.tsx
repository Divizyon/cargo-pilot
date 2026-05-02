import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentPlans } from '@/lib/api/useRecentPlans';
import { useUIStore } from '@/lib/store/useUIStore';
import { RecentPlanRow } from './RecentPlanRow';
import { PlanSnapshotPanel } from './PlanSnapshotPanel';

export function DashboardRecentPlans() {
  const { data, isLoading, isError } = useRecentPlans();
  const selectedId = useUIStore((s) => s.selectedSnapshotPlanId);
  const setSelectedSnapshotPlanId = useUIStore((s) => s.setSelectedSnapshotPlanId);

  useEffect(() => {
    if (data?.[0]?.id) {
      setSelectedSnapshotPlanId(data[0].id);
    }
  }, [data, setSelectedSnapshotPlanId]);

  return (
    <div className="rounded-xl border bg-card shadow-none overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <p className="text-base font-semibold text-foreground">Son Yapılan 7 Plan</p>
      </div>

      {isError && (
        <div className="px-6 pb-4">
          <Alert variant="destructive">
            <AlertDescription>Plan listesi yüklenemedi.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div>
          {isLoading ? (
            <ul className="px-6 pb-4 space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-12 w-full rounded-md animate-pulse bg-accent" />
                </li>
              ))}
            </ul>
          ) : !data?.length ? (
            <p className="px-6 pb-4 text-sm text-muted-foreground">Henüz plan oluşturulmamış.</p>
          ) : (
            <ul>
              {data.map((plan) => (
                <RecentPlanRow key={plan.id} plan={plan} isSelected={plan.id === selectedId} />
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden m-4">
          <PlanSnapshotPanel />
        </div>
      </div>
    </div>
  );
}
