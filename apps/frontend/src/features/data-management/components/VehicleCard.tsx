import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, RotateCcw, ArrowUpDown, MoveHorizontal, Scale, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteLoadingPlan } from '@/lib/api/useLoadingPlans';
import { planningDetailRoute } from '@/lib/config/routes';
import { cn } from '@/lib/utils';
import type {
  LoadingPlanListItem,
  PlanProductGroup,
  PlanProductItem,
} from '@/lib/types/loadingPlan';
import { useLoadingPlanProducts } from '@/lib/api/useLoadingPlans';

// ─── Constraint icons ─────────────────────────────────────────────────────────

const CONSTRAINT_ICON: Record<string, ReactNode> = {
  fragile: <AlertCircle className="w-3 h-3 text-rose-500" />,
  liquid: <RotateCcw className="w-3 h-3 text-blue-500" />,
  bottom_only: <ArrowUpDown className="w-3 h-3 text-amber-500" />,
  no_rotate: <MoveHorizontal className="w-3 h-3 text-zinc-400" />,
};

const CONSTRAINT_LABEL: Record<string, string> = {
  fragile: 'Kırılgan',
  liquid: 'Sıvı',
  bottom_only: 'Sadece Alta',
  no_rotate: 'Döndürülemez',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFillClass(pct: number): string {
  if (pct >= 100) return 'text-destructive font-semibold';
  if (pct >= 85) return 'text-amber-600 dark:text-amber-400 font-semibold';
  return 'text-foreground';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Flat product row ─────────────────────────────────────────────────────────

const ITEM_ROW_H = 36;

interface FlatProduct extends PlanProductItem {
  groupColor: string;
  groupName: string;
}

function flattenGroups(groups: PlanProductGroup[]): FlatProduct[] {
  return groups.flatMap((g) =>
    g.products.map((p) => ({ ...p, groupColor: g.color, groupName: g.name })),
  );
}

function ProductRow({ product }: { product: FlatProduct }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-0 border-b border-border last:border-0"
      style={{ height: ITEM_ROW_H }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: product.groupColor }}
        title={product.groupName}
      />
      <span className="flex-1 min-w-0 text-xs text-foreground truncate">{product.name}</span>
      <span className="text-[10px] font-semibold text-foreground bg-muted/60 border border-border px-1.5 rounded shrink-0">
        x{product.quantity}
      </span>
      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
        <Scale className="w-3 h-3" />
        {product.unitWeightKg}kg
      </span>
      {product.constraints.length > 0 && (
        <div className="flex items-center gap-0.5 shrink-0">
          {product.constraints.slice(0, 2).map((c) => (
            <span key={c} title={CONSTRAINT_LABEL[c] ?? c}>
              {CONSTRAINT_ICON[c] ?? null}
            </span>
          ))}
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
  previewHeight?: number;
  productsMaxHeight?: number;
}

export function VehicleCard({
  plan,
  index,
  onSelect,
  previewHeight = 120,
  productsMaxHeight = 260,
}: VehicleCardProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { mutate: deletePlan, isPending: isDeleting } = useDeleteLoadingPlan();
  const { data: productGroups = [] } = useLoadingPlanProducts(plan.id);

  const flatProducts = flattenGroups(productGroups as PlanProductGroup[]);

  function handleClick() {
    if (onSelect) onSelect();
    else navigate(planningDetailRoute(plan.id));
  }

  const weightPct = plan.fillPercentage;
  const planDate = formatDate(plan.plannedAt ?? plan.createdAt);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* ── Header ── */}
      <div className="px-4 pt-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-start gap-2.5 mb-3">
          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-background text-[10px] font-bold shrink-0">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {plan.planName}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{planDate}</p>
          </div>
          <button
            aria-label="Planı sil"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground leading-tight truncate">
              {plan.vehicleName}
            </p>
            {plan.vehiclePlate && (
              <p className="text-xs text-muted-foreground mt-0.5">{plan.vehiclePlate}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn('text-[11px]', getFillClass(weightPct))}>
              Doluluk: {weightPct.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── 3D Preview ── */}
      <div
        className="relative flex items-center justify-center bg-muted/40 border-b border-border overflow-hidden shrink-0"
        style={{ height: previewHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {plan.thumbnailUrl && !imgError ? (
          <img
            src={plan.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <>
            <svg
              viewBox="0 0 160 80"
              className="w-36 opacity-20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="10"
                y="20"
                width="120"
                height="50"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <rect
                x="10"
                y="20"
                width="22"
                height="50"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
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
              <circle cx="32" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="110" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="124" cy="74" r="6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/60 font-medium tracking-wide">
              3D görünüm — yakında
            </span>
          </>
        )}
      </div>

      {/* ── Scrollable product list ── */}
      <div
        className="overflow-y-auto scrollbar-hide"
        style={{ height: productsMaxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {flatProducts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            Ürün bulunamadı.
          </div>
        ) : (
          flatProducts.map((product) => (
            <ProductRow key={`${product.id}-${product.groupColor}`} product={product} />
          ))
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Planı sil</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{plan.planName}</strong> planı silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                deletePlan(plan.id);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
