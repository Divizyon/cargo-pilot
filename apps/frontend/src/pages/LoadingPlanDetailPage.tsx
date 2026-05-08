import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft, Package2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLoadingPlanListItem, useLoadingPlanProducts } from '@/lib/api/useLoadingPlans';
import type { LoadingPlanListItem } from '@/lib/types/loadingPlan';
import { PlanStatus } from '@/lib/types/loadingPlan';
import { cn } from '@/lib/utils';
import { ProductGroupBlock } from '@/features/planning/components/ProductGroupBlock';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPlanDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy');
  } catch {
    return '—';
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  [PlanStatus.Tamamlandi]: {
    label: 'Tamamlandı',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [PlanStatus.Aktif]: {
    label: 'Aktif',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [PlanStatus.Taslak]: {
    label: 'Taslak',
    className: 'bg-zinc-50 text-zinc-600 border-zinc-200',
  },
  [PlanStatus.Iptal]: {
    label: 'İptal',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

// ─── TruncatedPlanName ────────────────────────────────────────────────────────

interface TruncatedPlanNameProps {
  name: string;
  className?: string;
}

function TruncatedPlanName({ name, className }: TruncatedPlanNameProps) {
  const shouldTruncate = name.length > 60;
  const displayName = shouldTruncate ? name.slice(0, 60) + '…' : name;

  if (!shouldTruncate) {
    return <span className={className}>{name}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('cursor-default', className)}>{displayName}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm break-words">{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

interface VehicleCardProps {
  plan: LoadingPlanListItem;
  index: number;
}

function VehicleCard({ plan, index }: VehicleCardProps) {
  const isContainer = plan.vehicleName.toLowerCase().includes('konteyner') ||
    plan.vehicleName.toLowerCase().includes('ft');
  const date = formatPlanDate(plan.plannedAt ?? plan.createdAt);
  const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG[PlanStatus.Taslak];

  const { data: productGroups = [] } = useLoadingPlanProducts(plan.id);

  return (
    <div className="space-y-3">
      {/* Card header: sequence number, vehicle name, date */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-semibold shrink-0">
          {index}
        </span>
        <span className="text-sm font-medium text-zinc-800 truncate">{plan.vehicleName}</span>
        {plan.vehiclePlate && (
          <span className="text-xs text-zinc-400 shrink-0">{plan.vehiclePlate}</span>
        )}
        <span className="text-xs text-zinc-400 shrink-0 ml-auto">{date}</span>
      </div>

      {/* Vehicle stats card */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            {isContainer ? (
              <Package2 className="w-4 h-4 text-zinc-500" strokeWidth={2} />
            ) : (
              <Truck className="w-4 h-4 text-zinc-500" strokeWidth={2} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-zinc-800">{plan.vehicleName}</p>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                  statusCfg.className,
                )}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{plan.planCode}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label="Ürün Sayısı" value={`${plan.productCount} adet`} />
          <StatCell
            label="Toplam Ağırlık"
            value={`${(plan.totalWeightKg / 1000).toFixed(1)} t`}
          />
          <StatCell
            label="Araç Kapasitesi"
            value={`${(plan.vehicleCapacityKg / 1000).toFixed(1)} t`}
          />
          <StatCell label="Doluluk" value={`%${plan.fillPercentage}`} highlight />
        </div>

        {/* Fill bar */}
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                plan.fillPercentage >= 90
                  ? 'bg-emerald-500'
                  : plan.fillPercentage >= 60
                    ? 'bg-blue-500'
                    : 'bg-zinc-400',
              )}
              style={{ width: `${plan.fillPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Product groups */}
      {productGroups.length > 0 && (
        <div className="space-y-2">
          {productGroups.map((group, i) => (
            <ProductGroupBlock
              key={group.id}
              group={group}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-zinc-400">{label}</span>
      <span className={cn('text-sm font-medium', highlight ? 'text-zinc-900' : 'text-zinc-600')}>
        {value}
      </span>
    </div>
  );
}

// ─── LoadingPlanDetailPage ────────────────────────────────────────────────────

export function LoadingPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, isError } = useLoadingPlanListItem(id ?? '');

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <p className="text-sm text-zinc-500">Plan bulunamadı.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/planning')}>
          Planlara dön
        </Button>
      </div>
    );
  }

  const planDate = formatPlanDate(plan.plannedAt ?? plan.createdAt);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-50">
      <div className="px-6 py-5 border-b border-zinc-200 bg-white">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 text-zinc-500 hover:text-zinc-900"
          onClick={() => navigate('/planning')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Planlar
        </Button>

        <h1 className="text-xl font-semibold text-zinc-900 leading-snug">
          <TruncatedPlanName name={plan.planName} />
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{planDate}</p>
      </div>

      <div className="flex-1 px-6 py-6 max-w-3xl space-y-4">
        <VehicleCard plan={plan} index={1} />
      </div>
    </div>
  );
}
