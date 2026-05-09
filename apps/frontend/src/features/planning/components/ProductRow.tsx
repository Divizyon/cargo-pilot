import { type ElementType } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Droplets,
  FlipHorizontal2,
  Layers,
  Scale,
  SkullIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConstraintType, type PlanProductItem } from '@/lib/types/loadingPlan';

// ─── Constraint icon config ───────────────────────────────────────────────────

const CONSTRAINT_CONFIG: Record<
  ConstraintType,
  { label: string; Icon: ElementType; className: string }
> = {
  [ConstraintType.Fragile]: {
    label: 'Kırılgan',
    Icon: AlertTriangle,
    className: 'text-amber-500',
  },
  [ConstraintType.Liquid]: {
    label: 'Sıvı İçerir',
    Icon: Droplets,
    className: 'text-blue-500',
  },
  [ConstraintType.BottomOnly]: {
    label: 'Sadece Bu Yüz Altta',
    Icon: ArrowDownToLine,
    className: 'text-purple-500',
  },
  [ConstraintType.NoRotate]: {
    label: 'Döndürülemez',
    Icon: FlipHorizontal2,
    className: 'text-orange-500',
  },
  [ConstraintType.HeavySide]: {
    label: 'Ağır Taraf',
    Icon: Scale,
    className: 'text-zinc-500',
  },
  [ConstraintType.Hazmat]: {
    label: 'Tehlikeli Madde',
    Icon: SkullIcon,
    className: 'text-rose-600',
  },
};

// ─── TruncatedName ────────────────────────────────────────────────────────────

interface TruncatedNameProps {
  name: string;
}

function TruncatedName({ name }: TruncatedNameProps) {
  if (name.length <= 60) {
    return <span className="text-xs text-zinc-700">{name}</span>;
  }
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs text-zinc-700 cursor-default">{name.slice(0, 60)}…</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm break-words text-xs">{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── ConstraintIcons ──────────────────────────────────────────────────────────

interface ConstraintIconsProps {
  constraints: ConstraintType[];
}

function ConstraintIcons({ constraints }: ConstraintIconsProps) {
  if (constraints.length === 0) {
    return <span className="w-20 shrink-0" />;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 shrink-0">
        {constraints.map((type) => {
          const cfg = CONSTRAINT_CONFIG[type];
          if (!cfg) return null;
          const { Icon, label, className } = cfg;
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <span className={cn('cursor-default', className)}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ─── ProductRow ───────────────────────────────────────────────────────────────

interface ProductRowProps {
  product: PlanProductItem;
}

export function ProductRow({ product }: ProductRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-50 transition-colors min-w-0">
      {/* Name — takes remaining space */}
      <div className="flex-1 min-w-0 truncate">
        <TruncatedName name={product.name} />
      </div>

      {/* Quantity */}
      <span className="text-xs tabular-nums text-zinc-500 shrink-0 w-10 text-right">
        x{product.quantity}
      </span>

      {/* Unit weight */}
      <span className="text-xs tabular-nums text-zinc-500 shrink-0 w-16 text-right">
        {product.unitWeightKg} kg
      </span>

      {/* Layer count */}
      <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-zinc-400 shrink-0 w-10">
        <Layers className="w-3 h-3" />
        {product.layerCount}
      </span>

      {/* Constraint icons */}
      <ConstraintIcons constraints={product.constraints} />
    </div>
  );
}
