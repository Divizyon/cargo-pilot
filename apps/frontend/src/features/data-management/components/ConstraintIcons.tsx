import { Droplets, Flame, FlaskConical, RotateCcw, Sun, Utensils, Wind, Wine } from 'lucide-react';

import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ConstraintIconsProps {
  fragilityTypes: number[];
  isStackable: boolean;
  allowRotateX: boolean;
  allowRotateY: boolean;
  allowRotateZ: boolean;
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

const FRAGILITY_ICON_MAP: Record<number, { icon: ElementType; label: string; className: string }> =
  {
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
    4: { icon: Wind, label: 'Koku Hassas', className: 'border-teal-200 bg-teal-50 text-teal-600' },
    5: {
      icon: Utensils,
      label: 'Gıda Teması',
      className: 'border-green-200 bg-green-50 text-green-600',
    },
    6: {
      icon: Sun,
      label: 'Kuru Tutulmalı',
      className: 'border-yellow-200 bg-yellow-50 text-yellow-600',
    },
    7: {
      icon: FlaskConical,
      label: 'Kimyasal',
      className: 'border-purple-200 bg-purple-50 text-purple-600',
    },
  };

function buildConstraints({
  fragilityTypes,
  isStackable,
  allowRotateX,
  allowRotateY,
  allowRotateZ,
}: ConstraintIconsProps): ConstraintDef[] {
  const defs: ConstraintDef[] = [];

  for (const f of fragilityTypes ?? []) {
    const meta = FRAGILITY_ICON_MAP[f];
    if (meta) defs.push(meta);
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
