import { useState, type ReactNode } from 'react';
import { ClipboardList, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { LoadingPlanFilterBar } from '@/features/data-management/components/LoadingPlanFilterBar';
import { VehicleCard } from '@/features/data-management/components/VehicleCard';
import { useLoadingPlanFilters } from '@/features/data-management/hooks/useLoadingPlanFilters';
import { useLoadingPlanList } from '@/lib/api/useLoadingPlans';
import { cn } from '@/lib/utils';

// ─── Summary stat card (snapshot bölümü) ─────────────────────────────────────

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  accent?: string;
}

function StatCard({ icon, value, label, accent }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4">
      <div className="shrink-0 text-muted-foreground">{icon}</div>
      <div>
        <p className={cn('text-xl font-bold leading-none', accent ?? 'text-foreground')}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Card grid (3 sütun sabit — AC6) ─────────────────────────────────────────

interface CardGridProps {
  filters: ReturnType<typeof useLoadingPlanFilters>;
}

function CardGrid({ filters }: CardGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { search, plate, vehicleNames, dateFrom, dateTo } = filters;

  const { data, isLoading } = useLoadingPlanList(
    { search, plate, vehicleNames, dateFrom, dateTo },
    page,
    pageSize,
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[380px] animate-pulse rounded-xl border border-border bg-muted"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
        Eşleşen yükleme planı bulunamadı.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((plan, i) => (
          <VehicleCard key={plan.id} plan={plan} index={(page - 1) * pageSize + i} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} / {totalCount} kayıt
          </span>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-colors',
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoadingPlansPage() {
  const filters = useLoadingPlanFilters();

  const { data: allData } = useLoadingPlanList({}, 1, 1);
  const { data: activeData } = useLoadingPlanList({ status: 'aktif' }, 1, 1);
  const { data: completedData } = useLoadingPlanList({ status: 'tamamlandi' }, 1, 1);
  const { data: draftData } = useLoadingPlanList({ status: 'taslak' }, 1, 1);

  const totalCount = allData?.totalCount ?? 0;
  const activeCount = activeData?.totalCount ?? 0;
  const completedCount = completedData?.totalCount ?? 0;
  const draftCount = draftData?.totalCount ?? 0;

  const allVehicleNames = allData?.allVehicleNames ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Başlık */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Yükleme Planları</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Araçlara atanmış tüm yükleme planlarının izlendiği ve yönetildiği merkez.
          </p>
        </div>
      </div>

      {/* Anlık görüntü (snapshot) bölümü */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<FileText className="h-5 w-5" />} value={totalCount} label="Toplam Plan" />
        <StatCard
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          value={activeCount}
          label="Aktif Plan"
          accent="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          value={completedCount}
          label="Tamamlandı"
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard icon={<ClipboardList className="h-5 w-5" />} value={draftCount} label="Taslak" />
      </div>

      {/* Arama + filtre çubuğu (snapshot'ın hemen altında, sabit — AC1) */}
      <LoadingPlanFilterBar filters={filters} allVehicleNames={allVehicleNames} />

      {/* Kart grid (3 sütun — AC6) */}
      <CardGrid filters={filters} />
    </div>
  );
}
