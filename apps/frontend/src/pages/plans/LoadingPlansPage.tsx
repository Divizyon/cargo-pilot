import { LoadingPlanTable } from '@/features/data-management/plans/components/LoadingPlanTable';

export function LoadingPlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Yükleme Planları</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Araçlara atanmış tüm yükleme planlarının izlendiği ve yönetildiği merkez.
          </p>
        </div>
      </div>

      <LoadingPlanTable />
    </div>
  );
}
