import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CheckResult, CheckStatus } from '../verification/types';

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'geçti',
  fail: 'başarısız',
  skipped: 'atlandı',
};

interface ConstraintChecksPanelProps {
  checks: readonly CheckResult[];
  /** Seçili kural; canvas vurgulaması buna bağlıdır. */
  selectedId: CheckResult['id'] | null;
  onSelect: (id: CheckResult['id'] | null) => void;
}

/**
 * Motorun sert kısıtlarının denetim sonucu. `atlandı`, `geçti`den ayrı
 * gösterilir: senaryoda o kısıtı taşıyan ürün yoksa kural hiç koşmamıştır ve
 * yeşil göstermek sahte güven olurdu.
 *
 * On üç kural alt alta tam satır olunca panel çizimden uzun kalıyordu; oysa
 * geçen bir kuralda okunacak tek şey adı ve durumu. Onlar ızgarada tek satır,
 * ayrıntıları `title`da; ihlaller üstte tam genişlikte ve ayrıntısı açık —
 * yer, tıklanacak olan satırlara ayrılmış oluyor.
 */
export function ConstraintChecksPanel({
  checks,
  selectedId,
  onSelect,
}: ConstraintChecksPanelProps) {
  if (checks.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
        Kural denetimi için bir koşu çalıştırın.
      </p>
    );
  }

  const failing = checks.filter((c) => c.status === 'fail');
  const rest = checks.filter((c) => c.status !== 'fail');

  return (
    <div className="flex flex-col gap-2">
      {failing.map((check) => {
        const isSelectable = check.failedPlacementIndices.length > 0;
        const isSelected = selectedId === check.id;

        return (
          <button
            key={check.id}
            type="button"
            disabled={!isSelectable}
            onClick={() => onSelect(isSelected ? null : check.id)}
            title={check.sourceRef}
            className={cn(
              'flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors',
              isSelectable ? 'cursor-pointer hover:bg-accent' : 'cursor-default',
              isSelected ? 'border-foreground/40 bg-accent' : 'border-transparent',
            )}
          >
            <span className="flex items-center gap-2">
              <StatusDot check={check} />
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                {check.label}
              </span>
              {check.failedPlacementIndices.length > 0 && (
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {check.failedPlacementIndices.length}
                </span>
              )}
              <Badge variant={badgeVariant(check)} className="shrink-0">
                {check.severity === 'soft' ? 'bölge dışı' : STATUS_LABEL[check.status]}
              </Badge>
            </span>

            {check.detail && (
              <span className="pl-4 text-xs leading-snug text-muted-foreground">
                {check.detail}
              </span>
            )}
          </button>
        );
      })}

      {/* Tek kolon: panel artık formun altındaki dar kolonda duruyor. Geçen
          kuralın durumu noktadan okunuyor, sözcük yalnızca atlananlarda. */}
      <div className="flex flex-col">
        {rest.map((check) => (
          <div
            key={check.id}
            // Atlanma sebebi ve motordaki kaynak satırı burada; ikisi de satır
            // başına ikinci bir satır açmayı hak edecek kadar sık okunmuyor.
            title={check.detail ? `${check.detail} — ${check.sourceRef}` : check.sourceRef}
            className="flex items-center gap-2 py-0.5"
          >
            <StatusDot check={check} />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{check.label}</span>
            {check.status === 'skipped' && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {STATUS_LABEL[check.status]}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium">Atlandı</span> = senaryoda o kısıtı taşıyan ürün yok, kural
        hiç koşmadı. Başarısız kurala tıklayınca ilgili kutular görünümde vurgulanır.
      </p>
    </div>
  );
}

/**
 * Yumuşak kuralın ihlali ihlal değil uyarıdır; rengi de öyle olmalı. Yalnızca
 * başarısız satırlarda rozet var — geçen ve atlanan kurallar ızgarada düz metin.
 */
function badgeVariant(check: CheckResult) {
  return check.severity === 'soft' ? ('outline' as const) : ('destructive' as const);
}

function StatusDot({ check }: { check: CheckResult }) {
  const color =
    check.status === 'skipped'
      ? 'bg-muted-foreground/40'
      : check.status === 'pass'
        ? 'bg-state-pass'
        : check.severity === 'soft'
          ? 'bg-state-warn'
          : 'bg-destructive';

  return <span className={cn('size-2 shrink-0 rounded-full', color)} aria-hidden />;
}
