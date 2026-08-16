import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/shared/AppShell';
import { cn } from '@/lib/utils';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import type { SuiteRun, SuiteScenarioResult } from '../utils/suiteStorage';
import { CHECK_LABEL } from '../verification/checkLabels';

/**
 * Bozuk senaryoların listesi ve tek senaryo formuna dönüş yolu.
 *
 * Toplamlar "3 senaryoda ihlal var" der ve orada biter; oysa loop'un asıl işi o
 * üç senaryoya bakmak. Senaryo üretimi tohumlu olduğu için sıra numarasından
 * senaryo yeniden kurulabiliyor — rapordan doğrudan incelemeye geçmek bu yüzden
 * mümkün ve elle yeniden kurmaktan çok daha güvenilir.
 */
interface SuiteFailurePanelProps {
  /** Koşu yokken `null`; panel boş başlığıyla durur, sonradan belirmez. */
  run: SuiteRun | null;
  criteria: OptimizationCriteria;
  /**
   * Senaryoyu forma taşır. `null` ise yeniden kurulamıyor demektir (katalog ya
   * da üretim sürümü koşudan bu yana değişmiş) — satır tıklanabilir olmaz.
   */
  onInspect: ((index: number) => void) | null;
  reproduceBlockedReason: string | null;
}

/** Uzun listeler paneli boğuyor; en kötüler yeterli. */
const MAX_ROWS = 15;

/** Seçili kriterde ihlalli ya da hatalı senaryolar, en çok ihlalliden başlayarak. */
function failureRows(run: SuiteRun, criteria: OptimizationCriteria): SuiteScenarioResult[] {
  return run.results
    .filter((row) => row.criteria === criteria && (row.failedCheckCount > 0 || row.error !== null))
    .sort((a, b) => b.failedCheckCount - a.failedCheckCount);
}

export function SuiteFailurePanel({
  run,
  criteria,
  onInspect,
  reproduceBlockedReason,
}: SuiteFailurePanelProps) {
  const rows = run ? failureRows(run, criteria) : [];

  if (rows.length === 0) {
    return (
      <SectionCard title="Bozuk senaryolar (0)">
        <p className="text-sm text-muted-foreground">
          {run ? 'Bu kriterde ihlalli senaryo yok.' : 'Koşudan sonra ihlalli senaryolar listelenir.'}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={`Bozuk senaryolar (${rows.length})`}
      meta={
        <span className="text-xs text-muted-foreground">
          {reproduceBlockedReason ?? (onInspect ? 'satıra tıklayıp inceleyin' : null)}
        </span>
      }
    >
      <div className="-m-4 flex flex-col">
        {rows.slice(0, MAX_ROWS).map((row) => {
          const content = (
            <>
              <span className="w-10 shrink-0 font-mono tabular-nums text-muted-foreground">
                #{String(row.index).padStart(3, '0')}
              </span>

              {row.error !== null ? (
                <span className="min-w-0 flex-1 truncate text-destructive">{row.error}</span>
              ) : (
                <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                  {row.failedCheckIds.map((id) => (
                    <Badge key={id} variant="destructive" className="px-1.5 py-0 font-normal">
                      {CHECK_LABEL[id]}
                    </Badge>
                  ))}
                </span>
              )}

              <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                {row.fillPercent !== null ? `%${row.fillPercent.toFixed(1)}` : '—'}
              </span>
            </>
          );

          const className = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-xs last:border-b-0';

          return onInspect ? (
            <button
              key={`${row.index}-${row.criteria}`}
              type="button"
              onClick={() => onInspect(row.index)}
              className={cn(className, 'text-left transition-colors hover:bg-accent')}
            >
              {content}
            </button>
          ) : (
            <div key={`${row.index}-${row.criteria}`} className={className}>
              {content}
            </div>
          );
        })}

        {rows.length > MAX_ROWS && (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            …ve {rows.length - MAX_ROWS} senaryo daha. Tamamı dışa aktarılan raporda.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
