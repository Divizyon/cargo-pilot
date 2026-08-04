import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentPlans } from '@/lib/api/useRecentPlans';
import { useUIStore } from '@/lib/store/useUIStore';
import { cn } from '@/lib/utils';
import { RecentPlanRow } from './RecentPlanRow';
import { PlanSnapshotPanel } from './PlanSnapshotPanel';
import { DashboardPlanWizard } from './DashboardPlanWizard';

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
      <div className="px-4 pt-4 pb-2">
        <p className="text-base font-semibold text-foreground">Son Yapılan 7 Plan</p>
      </div>

      {isError && (
        <div className="px-4 pb-3">
          <Alert variant="destructive">
            <AlertDescription>Plan listesi yüklenemedi.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div>
          {/* Table header */}
          <div className="grid px-4 py-1.5 border-b border-border grid-cols-[minmax(0,1fr)_140px_48px_88px_72px_88px_72px]">
            {['PLAN ADI', 'ARAÇ', 'ÜRÜN', 'AĞIRLIK', 'HACİM', 'TARİH', ''].map((col, i) => (
              <span
                key={i}
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground',
                  i === 2 || i === 3 || i === 4 ? 'text-right' : '',
                  i === 5 ? 'pl-2' : '',
                )}
              >
                {col}
              </span>
            ))}
          </div>

          {isLoading ? (
            <ul className="px-4 pb-3 space-y-2 pt-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-9 w-full rounded-md animate-pulse bg-accent" />
                </li>
              ))}
            </ul>
          ) : !data?.length ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Henüz plan oluşturulmamış.</p>
          ) : (
            <ul>
              {data.map((plan) => (
                <RecentPlanRow key={plan.id} plan={plan} isSelected={plan.id === selectedId} />
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 m-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <PlanSnapshotPanel />
          </div>
          <DashboardPlanWizard />
        </div>
      </div>
    </div>
  );
}
