import { Droplets, RotateCcw, Wine } from 'lucide-react';

import type { ElementType } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ConstraintIconsProps {
  fragility: number;
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

function buildConstraints({
  fragility,
  isStackable,
  allowRotateX,
  allowRotateY,
  allowRotateZ,
}: ConstraintIconsProps): ConstraintDef[] {
  const defs: ConstraintDef[] = [];

  if (fragility === 2) {
    defs.push({
      icon: Droplets,
      label: 'Sıvı İçerir',
      className: 'border-blue-200 bg-blue-50 text-blue-600',
    });
  } else if (fragility === 1) {
    defs.push({
      icon: Wine,
      label: 'Kırılgan',
      className: 'border-amber-200 bg-amber-50 text-amber-600',
    });
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
