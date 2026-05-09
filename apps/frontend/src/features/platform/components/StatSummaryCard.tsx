import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { formatStatsDelta } from '@/lib/utils/formatStatsDelta';

interface Props {
  title: string;
  icon: LucideIcon;
  value: number;
  subInfo: string;
  delta: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  formatValue?: (v: number) => string;
}

const defaultFormat = (v: number) => new Intl.NumberFormat('tr-TR').format(v);

export function StatSummaryCard({
  title,
  icon: Icon,
  value,
  subInfo,
  delta,
  isLoading,
  isError,
  onRetry,
  formatValue = defaultFormat,
}: Props) {
  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-none">
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>İstatistikler yüklenemedi.</span>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2 h-7 gap-1">
                Yenile
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { text: deltaText, direction } = formatStatsDelta(delta);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-none">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {title}
        </span>
        <Icon className="size-5 text-muted-foreground shrink-0" />
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-10 w-24 animate-pulse bg-accent rounded-md mb-2" />
          <Skeleton className="h-4 w-40 animate-pulse bg-accent rounded-md mb-3" />
          <Skeleton className="h-4 w-28 animate-pulse bg-accent rounded-md" />
        </>
      ) : (
        <>
          <p className="text-4xl font-bold text-foreground tabular-nums mb-1">
            {formatValue(value)}
          </p>
          <p className="text-sm text-muted-foreground mb-3">{subInfo}</p>
          <div className="flex items-center gap-1">
            {direction === 'up' ? (
              <TrendingUp className="size-4 text-emerald-600" />
            ) : direction === 'down' ? (
              <TrendingDown className="size-4 text-red-500" />
            ) : null}
            <span
              className={cn(
                'text-sm font-medium',
                direction === 'up' && 'text-emerald-600',
                direction === 'down' && 'text-red-500',
                direction === 'neutral' && 'text-muted-foreground',
              )}
            >
              {deltaText}
            </span>
            <span className="text-sm text-muted-foreground">bu hafta</span>
          </div>
        </>
      )}
    </div>
  );
}
