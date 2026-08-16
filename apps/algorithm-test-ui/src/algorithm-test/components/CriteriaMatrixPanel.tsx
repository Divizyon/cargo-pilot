import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/shared/AppShell';
import { cn } from '@/lib/utils';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { hasFillMismatch, type AlgorithmRun } from '../hooks/useAlgorithmTestRun';
import { CRITERIA_LABEL, CRITERIA_ORDER } from '../hooks/useCriteriaMatrixRun';
import {
  isNeverEmittedReason,
  listNonZeroReasons,
  UNPLACED_REASON_TOOLTIP,
} from '../utils/unplacedReason';
import { summarizeChecks } from '../verification/runChecks';

/**
 * Üç kriterin karşılaştırması. Eskiden yedi kolonluk geniş bir tabloydu ve
 * okunan şey aslında üç satırdı; şimdi kriter başına bir kart.
 *
 * Kural denetiminin hemen altında, aynı ızgara diliyle duruyor: iki panel de
 * seçili koşuya ait ve ikisi de çizimi etkiliyor — üstteki tıklanan kuralın
 * kutularını vurguluyor, buradaki tıklanan kriterin yerleşimini getiriyor.
 */
interface CriteriaMatrixPanelProps {
  runs: AlgorithmRun[];
  selectedCriteria: OptimizationCriteria | null;
  pendingCriteria: readonly OptimizationCriteria[];
  onSelect: (criteria: OptimizationCriteria) => void;
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `%${value.toFixed(1)}`;
}

/** Denge sapmasında en iyi (en düşük) kriteri vurgulamak için. */
function bestBalanceCriteria(runs: AlgorithmRun[]): OptimizationCriteria | null {
  const scored = runs
    .filter((r) => r.balanceOffsetX !== null && r.balanceOffsetZ !== null)
    .map((r) => ({ criteria: r.criteria, total: (r.balanceOffsetX ?? 0) + (r.balanceOffsetZ ?? 0) }));
  if (scored.length === 0) return null;
  return scored.reduce((best, cur) => (cur.total < best.total ? cur : best)).criteria;
}

/**
 * Kural denetimi özeti. `atlandı` ayrı sayılır: hiç koşmamış bir kural geçmiş
 * sayılamaz. Yumuşak kural ihlali (LIFO bölge taşması) ihlal olarak sayılmaz.
 */
function CheckSummaryLine({ run }: { run: AlgorithmRun }) {
  const summary = summarizeChecks(run.checks);

  return (
    <span className="font-mono tabular-nums">
      {summary.fail > 0 ? (
        <span className="font-medium text-destructive">{summary.fail} başarısız · </span>
      ) : null}
      {summary.pass} geçti · {summary.skipped} atlandı
      {summary.softFail > 0 && ` · ${summary.softFail} bölge dışı`}
    </span>
  );
}

export function CriteriaMatrixPanel({
  runs,
  selectedCriteria,
  pendingCriteria,
  onSelect,
}: CriteriaMatrixPanelProps) {
  // Koşu yokken de üç kart durur. Panelin sonradan belirmesi sayfayı zıplatıyor
  // ve koşudan önce neyin ölçüleceğini göstermiyordu.
  const bestBalance = bestBalanceCriteria(runs);

  return (
    <SectionCard title="Kriterler">
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CRITERIA_ORDER.map((criteria) => {
          const run = runs.find((r) => r.criteria === criteria);
          const isPending = pendingCriteria.includes(criteria);

          if (!run) {
            return (
              <div
                key={criteria}
                className="flex items-baseline justify-between gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground"
              >
                <span>{CRITERIA_LABEL[criteria]}</span>
                <span className="text-xs">{isPending ? 'çalışıyor…' : '—'}</span>
              </div>
            );
          }

          const reasons = listNonZeroReasons(run.unplacedByReason);
          const isSelected = selectedCriteria === criteria;

          return (
            <button
              key={criteria}
              type="button"
              onClick={() => onSelect(criteria)}
              aria-pressed={isSelected}
              className={cn(
                'relative rounded-md border px-3 py-2.5 text-left transition-colors',
                isSelected ? 'border-foreground/40 bg-accent' : 'hover:bg-muted/50',
              )}
            >

              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {CRITERIA_LABEL[criteria]}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                  {formatPercent(run.fillPercent ?? run.clientFillPercent)}
                </span>
              </span>

              <span className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {run.placedCount}/{run.requestedCount} yerleşti · {run.durationMs.toFixed(0)} ms
                </span>

                {/* Sapma: merkeze göre normalize uzaklık, DÜŞÜK olan iyi. */}
                <span
                  className={cn(
                    'font-mono tabular-nums',
                    bestBalance === criteria && 'text-foreground',
                  )}
                  title="Ağırlık merkezinin araç ortasından sapması — düşük olan iyi (BalanceScoring.cs:24-55)"
                >
                  Sapma ↓ X {formatPercent(run.balanceOffsetX)} · Z{' '}
                  {formatPercent(run.balanceOffsetZ)}
                </span>

                <CheckSummaryLine run={run} />

                {hasFillMismatch(run) && (
                  <span className="text-destructive">
                    Doluluk uyuşmuyor — istemci %{run.clientFillPercent.toFixed(1)}
                  </span>
                )}
              </span>

              {reasons.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-1">
                  {reasons.map((r) => (
                    <Badge
                      key={r.reason}
                      variant="destructive"
                      className="font-normal"
                      // Motorun üretmediği bir kod geldiyse backend değişmiş demektir.
                      title={
                        isNeverEmittedReason(r.reason)
                          ? 'Motor bu kodu bugüne kadar üretmiyordu — backend değişmiş olabilir'
                          : UNPLACED_REASON_TOOLTIP[r.reason]
                      }
                    >
                      {r.count} {r.label}
                      {isNeverEmittedReason(r.reason) && ' ⚠'}
                    </Badge>
                  ))}
                </span>
              )}
            </button>
          );
          })}
        </div>

        {runs.some((r) => r.unplacedCount > 0) && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            İstif ve rotasyon redleri motorda ayrı sebep kodu üretmiyor: motor aday pozisyonu eler
            ve hiçbir pozisyon bulunamadığında tek kodla raporlar, bu yüzden
            <span className="text-foreground"> Hacim Yetersiz</span> altında toplanırlar
            (OptimizationEngine.cs:128-129).
          </p>
        )}
      </div>
    </SectionCard>
  );
}
