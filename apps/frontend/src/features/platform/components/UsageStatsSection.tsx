import { AlertTriangle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { SubscriptionUsage } from '@/lib/store/useSubscriptionStore';

interface UsageStatsSectionProps {
  usage: SubscriptionUsage;
}

interface UsageRowProps {
  label: string;
  used: number;
  limit: number | null;
}

function usagePct(used: number, limit: number | null): number {
  if (limit === null) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageRow({ label, used, limit }: UsageRowProps) {
  const pct = usagePct(used, limit);
  const unlimited = limit === null;
  const atWarning = pct >= 80 && pct < 100;
  const atLimit = pct >= 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span
          className={cn(
            'tabular-nums text-muted-foreground',
            atWarning && 'text-amber-600 dark:text-amber-400',
            atLimit && 'font-semibold text-destructive',
          )}
        >
          {unlimited ? `${used} / Sınırsız` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={cn(
            'h-1.5',
            atWarning && '[&>div]:bg-amber-500',
            atLimit && '[&>div]:bg-destructive',
          )}
        />
      )}
    </div>
  );
}

export function UsageStatsSection({ usage }: UsageStatsSectionProps) {
  const planPct = usagePct(usage.plansUsed, usage.plansLimit);
  const vehiclePct = usagePct(usage.vehiclesCount, usage.vehiclesLimit);
  const productPct = usagePct(usage.productsCount, usage.productsLimit);

  const anyAtLimit = planPct >= 100 || vehiclePct >= 100 || productPct >= 100;
  const anyAtWarning = !anyAtLimit && (planPct >= 80 || vehiclePct >= 80 || productPct >= 80);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <UsageRow label="Yükleme Planı" used={usage.plansUsed} limit={usage.plansLimit} />
        <UsageRow label="Araç" used={usage.vehiclesCount} limit={usage.vehiclesLimit} />
        <UsageRow label="Ürün" used={usage.productsCount} limit={usage.productsLimit} />
      </div>

      {usage.renewalDate && (
        <p className="text-xs text-muted-foreground">
          Yenileme:{' '}
          <span className="font-medium text-foreground">
            {new Intl.DateTimeFormat('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(usage.renewalDate))}
          </span>
        </p>
      )}

      {anyAtWarning && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Yükleme hakkınızın %80'ini kullandınız.</AlertDescription>
        </Alert>
      )}

      {anyAtLimit && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>Plan limitinize ulaştınız. Planınızı yükseltin.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
