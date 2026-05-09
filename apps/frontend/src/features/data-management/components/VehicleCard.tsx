import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Maximize2,
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  MoveHorizontal,
  Scale,
  Layers3,
} from 'lucide-react';
import { planningDetailRoute } from '@/lib/config/routes';
import { cn } from '@/lib/utils';
import type { LoadingPlanListItem, PlanProductGroup, PlanProductItem } from '@/lib/types/loadingPlan';
import { PlanStatus } from '@/lib/types/loadingPlan';
import { useLoadingPlanProducts } from '@/lib/api/useLoadingPlans';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  [PlanStatus.Tamamlandi]: 'Tamamlandı',
  [PlanStatus.Aktif]: 'Aktif',
  [PlanStatus.Iptal]: 'İptal',
  [PlanStatus.Taslak]: 'Taslak',
};

const STATUS_CLASS: Record<string, string> = {
  [PlanStatus.Tamamlandi]: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  [PlanStatus.Aktif]: 'bg-blue-50 text-blue-700 border border-blue-200',
  [PlanStatus.Iptal]: 'bg-red-50 text-red-700 border border-red-200',
  [PlanStatus.Taslak]: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
};

// ─── Constraint icons ─────────────────────────────────────────────────────────

const CONSTRAINT_ICON: Record<string, React.ReactNode> = {
  fragile: <AlertCircle className="w-3 h-3 text-rose-500" />,
  liquid: <RotateCcw className="w-3 h-3 text-blue-500" />,
  bottom_only: <ArrowUpDown className="w-3 h-3 text-amber-500" />,
  no_rotate: <MoveHorizontal className="w-3 h-3 text-zinc-400" />,
  heavy_side: <Scale className="w-3 h-3 text-purple-500" />,
  hazmat: <AlertCircle className="w-3 h-3 text-orange-500" />,
};

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductItemRow({ product }: { product: PlanProductItem }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-zinc-100 last:border-0">
      <span className="mt-1 w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-zinc-800">{product.name}</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-200 text-[11px] font-semibold text-zinc-700 bg-zinc-50">
            x{product.quantity}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-zinc-500 bg-zinc-100">
            Katman #{product.layerCount}
          </span>
          {product.constraints.map((c) => (
            <span key={c} className="flex items-center gap-0.5" title={c}>
              {CONSTRAINT_ICON[c] ?? null}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[11px] text-zinc-500 ml-auto">
            <Scale className="w-3 h-3" />
            {product.unitWeightKg} kg
            <Layers3 className="w-3 h-3 ml-1" />
            {product.layerCount}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

interface VehicleCardProps {
  plan: LoadingPlanListItem;
  onSelect?: () => void;
}

export function VehicleCard({ plan, onSelect }: VehicleCardProps) {
  const navigate = useNavigate();
  const [hovering3D, setHovering3D] = useState(false);
  const [activeGroup, setActiveGroup] = useState('');

  const { data: productGroups = [] } = useLoadingPlanProducts(plan.id);

  function handleClick() {
    if (onSelect) {
      onSelect();
    } else {
      navigate(planningDetailRoute(plan.id));
    }
  }

  const effectiveGroup = activeGroup || productGroups[0]?.id || '';
  const selectedGroup = productGroups.find((g: PlanProductGroup) => g.id === effectiveGroup) ?? productGroups[0];

  const volumePct = plan.volumeFillPercentage;
  const weightPct = plan.fillPercentage;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* ── Three.js placeholder area ── */}
      <div
        className="relative cursor-pointer bg-zinc-100"
        style={{ height: 220 }}
        onMouseEnter={() => setHovering3D(true)}
        onMouseLeave={() => setHovering3D(false)}
        onClick={handleClick}
      >
        {/* placeholder visual */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 opacity-30">
            <Box className="w-12 h-12 text-zinc-500" strokeWidth={1} />
          </div>
        </div>

        {/* "Open 3D View" overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            hovering3D ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 shadow-md backdrop-blur-sm text-sm font-medium text-zinc-800">
            <Maximize2 className="w-4 h-4" />
            3D Görünümü Aç
          </div>
        </div>

        {/* CoG badge */}
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-700">
            Hacim: %{volumePct.toFixed(0)} · Ağırlık: %{weightPct.toFixed(0)}
          </span>
        </div>
      </div>

      {/* ── Container header ── */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-100">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-bold shrink-0">
            1
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-zinc-900 leading-tight">{plan.vehicleName}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{plan.planCode}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold',
                volumePct >= 80
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200',
              )}
            >
              Hacim: {volumePct.toFixed(0)}%
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
              Ağırlık: {weightPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Status + plan name */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
              STATUS_CLASS[plan.status] ?? STATUS_CLASS[PlanStatus.Taslak],
            )}
          >
            {STATUS_LABEL[plan.status] ?? plan.status}
          </span>
          <span className="text-xs text-zinc-500 truncate">{plan.planName}</span>
        </div>
      </div>

      {/* ── Product group tabs ── */}
      {productGroups.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-100 overflow-x-auto">
          {productGroups.map((g: PlanProductGroup) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-colors shrink-0',
                effectiveGroup === g.id
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400',
              )}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Product items ── */}
      <div className="flex-1 overflow-y-auto max-h-[260px] divide-y divide-zinc-50">
        {selectedGroup?.products.map((p) => (
          <ProductItemRow key={p.id} product={p} />
        ))}
        {!selectedGroup && (
          <div className="flex items-center justify-center py-6 text-xs text-zinc-400">
            Ürün bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
