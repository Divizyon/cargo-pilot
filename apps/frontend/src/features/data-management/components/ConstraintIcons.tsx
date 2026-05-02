import { AlertTriangle, Droplets, Layers, RotateCcw } from 'lucide-react';
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
      icon: AlertTriangle,
      label: 'Kırılgan',
      className: 'border-amber-200 bg-amber-50 text-amber-600',
    });
  }

  if (isStackable) {
    defs.push({
      icon: Layers,
      label: 'İstiflenebilir',
      className: 'border-border bg-muted text-muted-foreground',
    });
  }

  if (allowRotateX || allowRotateY || allowRotateZ) {
    defs.push({
      icon: RotateCcw,
      label: 'Döndürülebilir',
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
