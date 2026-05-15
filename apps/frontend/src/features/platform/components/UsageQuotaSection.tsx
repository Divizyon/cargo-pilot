import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUsageQuota,
  usagePercent,
  isQuotaExceeded,
  type QuotaItem,
} from '@/lib/api/useUsageQuota';

interface QuotaRowProps {
  label: string;
  item: QuotaItem;
}

function QuotaRow({ label, item }: QuotaRowProps) {
  const unlimited = item.limit === null || item.limit === 0;
  const pct = usagePercent(item.used, item.limit);
  const exceeded = isQuotaExceeded(item);
  const warning = !exceeded && pct >= 80;

  const barColor = exceeded ? 'bg-destructive' : warning ? 'bg-amber-500' : 'bg-primary';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        {unlimited ? (
          <span className="text-muted-foreground">Sınırsız</span>
        ) : (
          <span
            className={cn(
              'font-medium',
              exceeded && 'text-destructive',
              warning && 'text-amber-600',
              !exceeded && !warning && 'text-foreground',
            )}
          >
            {item.used} / {item.limit}
          </span>
        )}
      </div>
      {!unlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UsageQuotaSection() {
  const { data, isPending, isError } = useUsageQuota();

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  const plansExceeded = isQuotaExceeded(data.plans);
  const plansPct = usagePercent(data.plans.used, data.plans.limit);
  const anyExceeded =
    plansExceeded || isQuotaExceeded(data.vehicles) || isQuotaExceeded(data.products);
  const anyWarning =
    !anyExceeded &&
    (plansPct >= 80 ||
      usagePercent(data.vehicles.used, data.vehicles.limit) >= 80 ||
      usagePercent(data.products.used, data.products.limit) >= 80);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Kullanım</p>
        {data.renewsAt && (
          <p className="text-xs text-muted-foreground">
            Yenileme:{' '}
            {new Intl.DateTimeFormat('tr-TR', {
              day: 'numeric',
              month: 'long',
            }).format(new Date(data.renewsAt))}
            {data.scope === 'company' && ' · Firma kotası'}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <QuotaRow label="Yükleme Planı" item={data.plans} />
        <QuotaRow label="Araç" item={data.vehicles} />
        <QuotaRow label="Ürün" item={data.products} />
      </div>

      {anyExceeded && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <XCircle className="mt-px h-4 w-4 shrink-0" />
          <span>Plan limitinize ulaştınız. Planınızı yükseltin.</span>
        </div>
      )}

      {anyWarning && (
        <div className="flex items-start gap-2 text-sm text-amber-600">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>Yükleme hakkınızın %80'ini kullandınız.</span>
        </div>
      )}
    </div>
  );
}
