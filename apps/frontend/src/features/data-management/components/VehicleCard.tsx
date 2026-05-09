import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  RotateCcw,
  ArrowUpDown,
  MoveHorizontal,
  Scale,
  Layers3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';
import type {
  LoadingPlanListItem,
  PlanProductGroup,
  PlanProductItem,
} from '@/lib/types/loadingPlan';
import { useLoadingPlanProducts } from '@/lib/api/useLoadingPlans';

// ─── Constraint icons + Turkish labels ───────────────────────────────────────

const CONSTRAINT_ICON: Record<string, ReactNode> = {
  fragile: <AlertCircle className="w-3 h-3 text-rose-500" />,
  liquid: <RotateCcw className="w-3 h-3 text-blue-500" />,
  bottom_only: <ArrowUpDown className="w-3 h-3 text-amber-500" />,
  no_rotate: <MoveHorizontal className="w-3 h-3 text-zinc-400" />,
  heavy_side: <Scale className="w-3 h-3 text-purple-500" />,
  hazmat: <AlertCircle className="w-3 h-3 text-orange-500" />,
};

const CONSTRAINT_LABEL: Record<string, string> = {
  fragile: 'Kırılgan',
  liquid: 'Sıvı',
  bottom_only: 'Sadece Alta',
  no_rotate: 'Döndürülemez',
  heavy_side: 'Ağır Yük',
  hazmat: 'Tehlikeli Madde',
};

// ─── Fill helpers ─────────────────────────────────────────────────────────────

function getFillClass(pct: number): string {
  if (pct >= 100) return 'text-destructive font-semibold';
  if (pct >= 85) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-foreground';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductItemRow({ product }: { product: PlanProductItem }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-medium text-foreground truncate block"
          title={product.name.length > 60 ? product.name : undefined}
        >
          {truncate(product.name)}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border text-[10px] font-semibold text-foreground bg-muted/50">
          x{product.quantity}
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Scale className="w-3 h-3" />
          {product.unitWeightKg} kg
        </span>
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Layers3 className="w-3 h-3" />
          {product.layerCount}
        </span>
        {product.constraints.length > 0 && (
          <div className="flex items-center gap-0.5">
            {product.constraints.map((c) => (
              <span key={c} title={CONSTRAINT_LABEL[c] ?? c} className="flex items-center">
                {CONSTRAINT_ICON[c] ?? null}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Group block (collapse/expand) ───────────────────────────────────────────

const PRODUCTS_PER_GROUP_THRESHOLD = 20;

function GroupBlock({ group }: { group: PlanProductGroup }) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const totalQty = group.products.reduce((sum, p) => sum + p.quantity, 0);
  const visibleProducts =
    showAll || group.products.length <= PRODUCTS_PER_GROUP_THRESHOLD
      ? group.products
      : group.products.slice(0, PRODUCTS_PER_GROUP_THRESHOLD);
  const hiddenCount = group.products.length - PRODUCTS_PER_GROUP_THRESHOLD;

  return (
    <div>
      <button
        className="flex w-full items-center gap-2 px-4 py-2 text-left border-b border-border hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <span className="flex-1 text-[11px] font-semibold text-foreground truncate">
          {group.name}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {group.id.slice(0, 8)}
        </span>
        <span className="text-[11px] text-muted-foreground shrink-0 ml-1">{totalQty} ürün</span>
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div>
          {visibleProducts.map((p) => (
            <ProductItemRow key={p.id} product={p} />
          ))}
          {!showAll && hiddenCount > 0 && (
            <button
              className="w-full px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll(true);
              }}
            >
              Daha fazla göster ({hiddenCount} ürün)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

interface VehicleCardProps {
  plan: LoadingPlanListItem;
  index: number;
  onSelect?: () => void;
}

export function VehicleCard({ plan, index, onSelect }: VehicleCardProps) {
  const navigate = useNavigate();

  const { data: productGroups = [] } = useLoadingPlanProducts(plan.id);

  function handleClick() {
    if (onSelect) {
      onSelect();
    } else {
      navigate(`${ROUTES.PLANNING_NEW}?fromPlan=${plan.id}`);
    }
  }

  const volumePct = plan.volumeFillPercentage;
  const weightPct = plan.fillPercentage;
  const planDate = formatDate(plan.plannedAt ?? plan.createdAt);

  // Dimensions: stored in cm, display in meters
  const widthM = (plan.interiorWidthM / 100).toFixed(2);
  const heightM = (plan.interiorHeightM / 100).toFixed(2);
  const depthM = (plan.interiorDepthM / 100).toFixed(2);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* ── Plan header (Plan Üst Bilgisi) ── */}
      <div className="px-4 pt-3 pb-3 border-b border-border">
        {/* Sıra no + plan adı + tarih */}
        <div className="flex items-start gap-2.5 mb-3">
          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold shrink-0">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold text-foreground leading-tight truncate"
              title={plan.planName.length > 60 ? plan.planName : undefined}
            >
              {truncate(plan.planName)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{planDate}</p>
          </div>
        </div>

        {/* Araç teknik bilgileri (AC1–AC5) */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground leading-tight truncate">
              {plan.vehicleName}
            </p>
            {plan.vehiclePlate && (
              <p className="text-xs text-muted-foreground mt-0.5">{plan.vehiclePlate}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {widthM} × {depthM} × {heightM} m
            </p>
          </div>

          {/* Doluluk göstergeleri üst bölümde (AC3–AC5) */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn('text-[11px]', getFillClass(volumePct))}>
              Hacim: {volumePct.toFixed(0)}%
              {volumePct >= 100 && (
                <span className="ml-1 text-destructive text-[10px]">Kapasite aşıldı</span>
              )}
            </span>
            <span className={cn('text-[11px]', getFillClass(weightPct))}>
              Ağırlık: {weightPct.toFixed(0)}%
              {weightPct >= 100 && (
                <span className="ml-1 text-destructive text-[10px]">Kapasite aşıldı</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3D taslak alanı ── */}
      <div
        className="relative flex items-center justify-center bg-muted/40 border-b border-border overflow-hidden"
        style={{ height: 120 }}
        onClick={(e) => e.stopPropagation()}
      >
        <svg
          viewBox="0 0 160 80"
          className="w-36 opacity-20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* araç gövdesi */}
          <rect
            x="10"
            y="20"
            width="120"
            height="50"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* ön bölme */}
          <rect
            x="10"
            y="20"
            width="22"
            height="50"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* kargo kutuları */}
          <rect
            x="36"
            y="28"
            width="22"
            height="20"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x="62"
            y="28"
            width="22"
            height="20"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x="88"
            y="28"
            width="22"
            height="20"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x="36"
            y="52"
            width="22"
            height="12"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x="62"
            y="52"
            width="22"
            height="12"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <rect
            x="88"
            y="52"
            width="22"
            height="12"
            rx="1"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          {/* tekerlekler */}
          <circle cx="32" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="110" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="124" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">
          3D görünüm — yakında
        </span>
      </div>

      {/* ── Product groups (AC6–AC8) ── */}
      <div className="flex-1 overflow-y-auto max-h-[320px]" onClick={(e) => e.stopPropagation()}>
        {(productGroups as PlanProductGroup[]).length > 0 ? (
          (productGroups as PlanProductGroup[]).map((g) => <GroupBlock key={g.id} group={g} />)
        ) : (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            Ürün bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}
