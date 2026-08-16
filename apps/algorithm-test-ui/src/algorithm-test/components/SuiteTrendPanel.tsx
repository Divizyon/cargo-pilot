import { useMemo } from 'react';
import { SectionCard } from '@/components/shared/AppShell';
import { cn } from '@/lib/utils';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { formatRunTime } from '../utils/formatRun';
import { aggregateFor, type SuiteRun } from '../utils/suiteStorage';

/**
 * Saklanan koşular boyunca ortalama dolulukun seyri.
 *
 * Aracın amacı "algoritma gelişiyor mu" sorusunu yanıtlamak ama arayüz yalnızca
 * son koşuyu ve tek bir referansı gösteriyordu; seri kayıtta duruyor, ekranda
 * durmuyordu. Yalnızca **karşılaştırılabilir** koşular çizilir (aynı tohum,
 * katalog ve senaryo üretimi) — girdisi farklı bir koşuyu aynı çizgiye koymak
 * motorun değil senaryonun farkını ölçerdi.
 *
 * Sütun yüksekliği serinin kendi aralığına göre ölçeklenir, sıfırdan değil:
 * doluluk oranları birbirine yakın seyrettiği için sıfır tabanlı çizim tüm
 * sütunları eşitler. Aralık başlıkta yazılı, okuyucu ölçeği görüyor.
 */
interface SuiteTrendPanelProps {
  /** Karşılaştırılabilir koşular, en yeniden eskiye. */
  runs: readonly SuiteRun[];
  criteria: OptimizationCriteria;
}

interface TrendPoint {
  completedAt: string;
  engineVersion: string | null;
  meanFill: number;
}

/** Aralığın tamamı sütuna dağılmaz; en düşük koşu da görünür kalmalı. */
const MIN_BAR_PERCENT = 12;

export function SuiteTrendPanel({ runs, criteria }: SuiteTrendPanelProps) {
  const points = useMemo<TrendPoint[]>(
    () =>
      [...runs]
        .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
        .map((run) => ({
          completedAt: run.completedAt,
          engineVersion: run.engineVersion,
          meanFill: aggregateFor(run, criteria).meanFill ?? Number.NaN,
        }))
        .filter((point) => Number.isFinite(point.meanFill)),
    [criteria, runs],
  );

  if (points.length < 2) {
    return (
      <SectionCard title="Ortalama doluluk eğilimi">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Eğilim için karşılaştırılabilir en az iki koşu gerekiyor. Aynı tohumla ikinci koşuyu
          yaptığınızda seri burada çıkar.
        </p>
      </SectionCard>
    );
  }

  const values = points.map((point) => point.meanFill);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.meanFill - first.meanFill;

  const heightPercent = (value: number) =>
    span === 0 ? 100 : MIN_BAR_PERCENT + ((value - min) / span) * (100 - MIN_BAR_PERCENT);

  return (
    <SectionCard
      title="Ortalama doluluk eğilimi"
      meta={
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          %{min.toFixed(1)} – %{max.toFixed(1)} · {points.length} koşu
        </span>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl tabular-nums text-foreground">
            %{last.meanFill.toFixed(1)}
          </span>
          <span
            className={cn(
              'font-mono text-sm tabular-nums',
              delta > 0 && 'text-state-pass',
              delta < 0 && 'text-destructive',
              delta === 0 && 'text-muted-foreground',
            )}
          >
            {delta === 0
              ? 'ilk koşuyla aynı'
              : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)} puan`}
          </span>
          <span className="text-xs text-muted-foreground">ilk koşuya göre</span>
        </div>

        <div className="flex h-16 items-end gap-1">
          {points.map((point, index) => (
            <div
              key={point.completedAt}
              title={`${formatRunTime(point.completedAt)}${
                point.engineVersion ? ` · ${point.engineVersion}` : ''
              } — %${point.meanFill.toFixed(1)}`}
              style={{ height: `${heightPercent(point.meanFill)}%` }}
              className={cn(
                'min-w-2 flex-1 rounded-sm',
                index === points.length - 1 ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>

        <div className="flex justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{formatRunTime(first.completedAt)}</span>
          <span>{formatRunTime(last.completedAt)}</span>
        </div>
      </div>
    </SectionCard>
  );
}
