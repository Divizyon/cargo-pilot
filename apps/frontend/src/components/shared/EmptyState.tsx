import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Kullanıcının buradan devam edebileceği aksiyonlar; boş durum çıkışsız bırakılmaz. */
  children?: ReactNode;
  className?: string;
}

/** Liste ve sekmelerin ortak boş durumu: ikon + tek cümle + çıkış aksiyonu. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">{children}</div>
      )}
    </div>
  );
}
