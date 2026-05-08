import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { planningDetailRoute } from '@/lib/config/routes';
import { FILL_THRESHOLDS } from '@/lib/config/thresholds';
import { cn } from '@/lib/utils';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { PlanStatus } from '@/lib/types/loadingPlan';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  [PlanStatus.Tamamlandi]: 'Tamamlandı',
  [PlanStatus.Aktif]: 'Aktif',
  [PlanStatus.Iptal]: 'İptal',
  [PlanStatus.Taslak]: 'Taslak',
};

const STATUS_CLASS: Record<string, string> = {
  [PlanStatus.Tamamlandi]:
    'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  [PlanStatus.Aktif]:
    'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  [PlanStatus.Iptal]:
    'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  [PlanStatus.Taslak]: 'bg-muted text-muted-foreground border border-border',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
        STATUS_CLASS[status] ?? STATUS_CLASS[PlanStatus.Taslak],
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Fill metric ──────────────────────────────────────────────────────────────

interface FillMetricProps {
  label: string;
  pct: number;
}

function FillMetric({ label, pct }: FillMetricProps) {
  const isWarning = pct >= FILL_THRESHOLDS.WARNING && pct < FILL_THRESHOLDS.CRITICAL;
  const isCritical = pct >= FILL_THRESHOLDS.CRITICAL;

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'text-base font-bold leading-none',
            isCritical
              ? 'text-red-600 dark:text-red-400'
              : isWarning
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-foreground',
          )}
        >
          %{pct}
        </span>
        {isCritical && (
          <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Kapasite aşıldı
          </span>
        )}
      </div>
      {/* Mini progress bar */}
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCritical
              ? 'bg-red-500'
              : isWarning
                ? 'bg-yellow-500'
                : 'bg-primary/50',
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

interface VehicleCardProps {
  plan: LoadingPlanListItem;
}

export function VehicleCard({ plan }: VehicleCardProps) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(planningDetailRoute(plan.id))}
      onKeyDown={(e) => e.key === 'Enter' && navigate(planningDetailRoute(plan.id))}
      className="flex cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Top section: fill metrics */}
      <div className="grid grid-cols-2 gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <FillMetric label="Hacim" pct={plan.volumeFillPercentage} />
        <FillMetric label="Ağırlık" pct={plan.fillPercentage} />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {/* Vehicle name + plate */}
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">{plan.vehicleName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{plan.vehiclePlate}</p>
        </div>

        {/* Interior dimensions */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">İç Ölçüler</p>
          <p className="mt-0.5 text-xs font-medium text-foreground">
            {plan.interiorWidthM.toFixed(2)} × {plan.interiorDepthM.toFixed(2)} × {plan.interiorHeightM.toFixed(2)} m
          </p>
          <p className="text-[10px] text-muted-foreground">En × Boy × Yükseklik</p>
        </div>

        {/* Plan name + status */}
        <div className="mt-auto flex items-start justify-between gap-2 border-t border-border pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{plan.planName}</p>
            <p className="text-[10px] text-muted-foreground">{plan.planCode}</p>
          </div>
          <StatusBadge status={plan.status} />
        </div>
      </div>
    </div>
  );
}
