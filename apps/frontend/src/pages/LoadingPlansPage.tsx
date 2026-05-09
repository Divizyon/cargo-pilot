import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Clock, FileText, LayoutGrid, Link2, List, CheckCircle2 } from 'lucide-react';
import { LoadingPlanFilterBar } from '@/features/data-management/components/LoadingPlanFilterBar';
import { LoadingPlanTable } from '@/features/data-management/components/LoadingPlanTable';
import { VehicleCard } from '@/features/data-management/components/VehicleCard';
import { useLoadingPlanFilters } from '@/features/data-management/hooks/useLoadingPlanFilters';
import { useLoadingPlanList } from '@/lib/api/useLoadingPlans';
import { useUIStore } from '@/lib/store/useUIStore';
import { cn } from '@/lib/utils';

// ─── Summary stat card ────────────────────────────────────────────────────────

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

// ─── View toggle ──────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'cards';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      <button
        onClick={() => onChange('table')}
        aria-label="Tablo görünümü"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          mode === 'table'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('cards')}
        aria-label="Kart görünümü"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
          mode === 'cards'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Card grid ────────────────────────────────────────────────────────────────

interface CardGridProps {
  filters: ReturnType<typeof useLoadingPlanFilters>;
  isSidebarOpen: boolean;
}

function CardGrid({ filters, isSidebarOpen }: CardGridProps) {
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const { search, statusTab, plate, vehicleNames, dateFrom, dateTo } = filters;

  const { data, isLoading } = useLoadingPlanList(
    { search, status: statusTab, plate, vehicleNames, dateFrom, dateTo },
    page,
    pageSize,
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', isSidebarOpen ? 'grid-cols-2' : 'grid-cols-3')}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[420px] animate-pulse rounded-xl border border-border bg-muted" />
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
      <div className={cn('grid gap-4', isSidebarOpen ? 'grid-cols-2' : 'grid-cols-3')}>
        {items.map((plan) => (
          <VehicleCard key={plan.id} plan={plan} />
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
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const { data: allData } = useLoadingPlanList({}, 1, 1);
  const { data: activeData } = useLoadingPlanList({ status: 'aktif' }, 1, 1);
  const { data: completedData } = useLoadingPlanList({ status: 'tamamlandi' }, 1, 1);
  const { data: draftData } = useLoadingPlanList({ status: 'taslak' }, 1, 1);

  const totalCount = allData?.totalCount ?? 0;
  const activeCount = activeData?.totalCount ?? 0;
  const completedCount = completedData?.totalCount ?? 0;
  const draftCount = draftData?.totalCount ?? 0;

  const allVehicleNames: string[] = [];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Yükleme Planları</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Araçlara atanmış tüm yükleme planlarının izlendiği ve yönetildiği merkez.
          </p>
        </div>
        <Link
          to="/planning/shares"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors shrink-0 mt-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          Paylaşım Bağlantıları
        </Link>
      </div>

      {/* Summary stats */}
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

      {/* Filter bar + view toggle + content */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <LoadingPlanFilterBar filters={filters} allVehicleNames={allVehicleNames} />
          </div>
          <div className="pt-1">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {viewMode === 'table' ? (
          <LoadingPlanTable filters={filters} />
        ) : (
          <CardGrid filters={filters} isSidebarOpen={isSidebarOpen} />
        )}
      </div>
    </div>
  );
}
