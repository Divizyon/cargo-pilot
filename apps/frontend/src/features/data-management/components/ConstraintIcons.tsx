import {
  Droplets,
  Flame,
  FlaskConical,
  Leaf,
  RotateCcw,
  Sun,
  Utensils,
  Wind,
  Wine,
  Zap,
} from 'lucide-react';

import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function CorrosiveIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: string | number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 3H5v4l7 9 7-9V3h-4" />
      <path d="M9 3l3 4 3-4" />
      <path d="M5 21c2-2 4-2 7-2s5 0 7 2" />
    </svg>
  );
}

interface ConstraintIconsProps {
  fragility: number;
  isStackable: boolean;
  allowRotateX: boolean;
  allowRotateY: boolean;
  allowRotateZ: boolean;
  constraintIds?: number[];
}

interface ConstraintDef {
  icon: ElementType;
  label: string;
  className: string;
}

function NonStackableIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="15" rx="2" />
      <path d="M9 15 V8" />
      <path d="M6 11 L9 8 L12 11" />
      <path d="M15 15 V8" />
      <path d="M12 11 L15 8 L18 11" />
      <line x1="2" y1="21" x2="22" y2="21" />
    </svg>
  );
}

const FRAGILITY_DEFS: Record<number, Omit<ConstraintDef, 'icon'> & { icon: ElementType }> = {
  1: { icon: Wine, label: 'Kırılgan', className: 'border-amber-200 bg-amber-50 text-amber-600' },
  2: {
    icon: Droplets,
    label: 'Sıvı İçerir',
    className: 'border-blue-200 bg-blue-50 text-blue-600',
  },
  3: {
    icon: Flame,
    label: 'Yanıcı',
    className: 'border-orange-200 bg-orange-50 text-orange-600',
  },
  4: {
    icon: Zap,
    label: 'Yakıcı',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  5: {
    icon: CorrosiveIcon,
    label: 'Aşındırıcı',
    className: 'border-green-200 bg-green-50 text-green-600',
  },
  6: {
    icon: Wind,
    label: 'Kokuya Hassas',
    className: 'border-green-200 bg-green-50 text-green-600',
  },
  7: {
    icon: Utensils,
    label: 'Gıda Teması',
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  8: { icon: Sun, label: 'Kuru', className: 'border-border bg-muted text-muted-foreground' },
  9: {
    icon: FlaskConical,
    label: 'Kimyasal',
    className: 'border-purple-200 bg-purple-50 text-purple-600',
  },
  10: { icon: Leaf, label: 'Organik', className: 'border-green-200 bg-green-50 text-green-600' },
};

function buildConstraints({
  fragility,
  isStackable,
  allowRotateX,
  allowRotateY,
  allowRotateZ,
  constraintIds,
}: ConstraintIconsProps): ConstraintDef[] {
  const defs: ConstraintDef[] = [];

  if (constraintIds && constraintIds.length > 0) {
    for (const id of constraintIds) {
      const def = FRAGILITY_DEFS[id];
      if (def) defs.push(def);
    }
  } else {
    const fragilityDef = FRAGILITY_DEFS[fragility];
    if (fragilityDef) defs.push(fragilityDef);
  }

  if (!isStackable) {
    defs.push({
      icon: NonStackableIcon,
      label: 'İstiflenemez',
      className: 'border-border bg-muted text-muted-foreground',
    });
  }

  if (!allowRotateX || !allowRotateY || !allowRotateZ) {
    defs.push({
      icon: RotateCcw,
      label: 'Rotasyon Kısıtlı',
      className: 'border-border bg-muted text-muted-foreground',
    });
  }

  return defs;
}

export function ConstraintIcons(props: ConstraintIconsProps) {
  const constraints = buildConstraints(props);

  if (constraints.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {constraints.map(({ icon: Icon, label, className }) => (
        <Badge
          key={label}
          variant="outline"
          title={label}
          className={cn('h-6 w-6 justify-center rounded-md p-0', className)}
        >
          <Icon className="h-3 w-3" strokeWidth={2} />
        </Badge>
      ))}
    </div>
  );
}
