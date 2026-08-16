import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Download, Play, Settings2, Square, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SectionCard } from '@/components/shared/AppShell';
import { cn } from '@/lib/utils';
import type { Item } from '@/lib/types/item';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { CRITERIA_LABEL, CRITERIA_ORDER } from '../criteria';
import type { UseSuiteRunResult } from '../hooks/useSuiteRun';
import type { SuiteProgress } from '../suite/runSuite';
import { buildSuiteReport, serializeReport, suiteReportFileName } from '../suite/suiteReport';
import { buildCatalogCoverage, fromCoverageCounts } from '../utils/catalogCoverage';
import { formatDuration, formatRunTime } from '../utils/formatRun';
import { GENERATOR_VERSION } from '../utils/suiteGenerator';
import {
  aggregateFor,
  aggregateResults,
  isComparable,
  type SuiteAggregate,
  type SuiteRun,
} from '../utils/suiteStorage';
import { toUnplacedReason, UNPLACED_REASON_LABEL } from '../utils/unplacedReason';
import { CHECK_LABEL } from '../verification/checkLabels';
import { CoveragePanel } from './CoveragePanel';
import { SuiteFailurePanel } from './SuiteFailurePanel';
import { CriteriaEffectivenessPanel, SuiteGatePanel } from './SuiteGatePanel';
import { SuiteTrendPanel } from './SuiteTrendPanel';

const DEFAULT_SEED = 1;
const DEFAULT_COUNT = 25;
const MAX_COUNT = 200;

function percent(value: number | null): string {
  return value !== null ? `%${value.toFixed(1)}` : '—';
}

interface SuitePanelProps {
  suite: UseSuiteRunResult;
  /** Koşu yokken kapsam bunlardan hesaplanır; koşu varsa kaydındaki sayılar geçerli. */
  items: readonly Item[];
  isCatalogReady: boolean;
  /** Şu anki kataloğun imzası; koşudakiyle tutmuyorsa senaryo yeniden kurulamaz. */
  currentCatalogSignature: string;
  onInspectScenario: (run: SuiteRun, index: number, criteria: OptimizationCriteria) => void;
}

export function SuitePanel({
  suite,
  items,
  isCatalogReady,
  currentCatalogSignature,
  onInspectScenario,
}: SuitePanelProps) {
  const { suites, progress, isRunning, error, start, cancel, clear } = suite;

  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [engineVersion, setEngineVersion] = useState('');
  const [criteria, setCriteria] = useState<OptimizationCriteria>(OptimizationCriteria.VolumeFirst);
  const [referenceAt, setReferenceAt] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const latest: SuiteRun | null = suites[0] ?? null;
  const elapsedMs = useElapsedMs(isRunning);

  // Yalnızca aynı tohum + katalog + üretim sürümüne sahip koşular referans olabilir;
  // diğerleriyle kıyas motorun değil girdinin farkını ölçer.
  const comparableRuns = useMemo(
    () =>
      latest
        ? suites.filter((run) => run.completedAt !== latest.completedAt && isComparable(run, latest))
        : [],
    [latest, suites],
  );

  const reference =
    comparableRuns.find((run) => run.completedAt === referenceAt) ?? comparableRuns[0] ?? null;

  const report = useMemo(
    () =>
      latest
        ? buildSuiteReport({
            run: latest,
            previous: reference,
            criteria,
            generatedAt: new Date().toISOString(),
          })
        : null,
    [criteria, latest, reference],
  );

  // Senaryo ancak aynı tohum + katalog + üretim sürümüyle birebir yeniden
  // kurulabilir. Tutmadığında düğme gösterip farklı bir yük açmak, hiç
  // göstermemekten kötüdür.
  const reproduceBlockedReason = !latest
    ? null
    : latest.generatorVersion !== GENERATOR_VERSION
      ? 'Senaryo üretimi bu koşudan sonra değişti — yeniden kurulamıyor.'
      : latest.catalogSignature !== currentCatalogSignature
        ? 'Katalog bu koşudan sonra değişti — senaryo yeniden kurulamıyor.'
        : null;

  function downloadReport() {
    if (!report || !latest) return;
    const blob = new Blob([serializeReport(report)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = suiteReportFileName(latest);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // Koşu varken ayarlar kapalı durur: üç girdi tam boy tepede kaldığında sonuç
  // ekranın altına düşüyordu ve koşudan sonra ilk bakılan şey girdiler değil.
  const isFormOpen = latest === null || settingsOpen;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {!isFormOpen && (
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                tohum <span className="text-foreground">{seed}</span> · {count} senaryo · motor{' '}
                <span className="text-foreground">{engineVersion.trim() || '—'}</span>
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {latest && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettingsOpen((open) => !open)}
                  aria-expanded={isFormOpen}
                >
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                  Ayarlar
                </Button>
              )}
              {suites.length > 0 && !isRunning && (
                <Button type="button" variant="ghost" size="sm" onClick={clear}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Kayıtları sil
                </Button>
              )}
              {isRunning ? (
                <Button type="button" variant="destructive" onClick={cancel}>
                  <Square className="mr-1.5 h-3.5 w-3.5" />
                  Durdur
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!isCatalogReady}
                  onClick={() => void start(seed, count, engineVersion.trim() || null)}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {latest ? 'Yeniden koş' : 'Koşuyu başlat'}
                </Button>
              )}
            </div>
          </div>

          {isFormOpen && (
            <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
              <Field id="suite-seed" label="Tohum" hint="karşılaştırma için sabit kalmalı">
                <Input
                  id="suite-seed"
                  type="number"
                  value={seed}
                  disabled={isRunning}
                  onChange={(e) => setSeed(Number(e.target.value) || 0)}
                  className="h-9 w-24 font-mono tabular-nums"
                />
              </Field>

              <Field id="suite-count" label="Senaryo" hint={`${count * 3} plan oluşturulur`}>
                <Input
                  id="suite-count"
                  type="number"
                  min={1}
                  max={MAX_COUNT}
                  value={count}
                  disabled={isRunning}
                  onChange={(e) =>
                    setCount(Math.min(MAX_COUNT, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="h-9 w-24 font-mono tabular-nums"
                />
              </Field>

              {/* Motor sürümü elle girilir: backend bunu bildiren bir uç sunmuyor ve
                  uydurmak yanlış rapordan kötüdür. */}
              <Field id="suite-engine" label="Motor sürümü" hint="rapora yazılır, isteğe bağlı">
                <Input
                  id="suite-engine"
                  placeholder="ör. e36c86a"
                  value={engineVersion}
                  disabled={isRunning}
                  onChange={(e) => setEngineVersion(e.target.value)}
                  className="h-9 w-36 font-mono"
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {progress && <ProgressCard progress={progress} elapsedMs={elapsedMs} />}

      {!isCatalogReady && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Katalog yükleniyor. Senaryo üretmek için en az bir araç ve bir ürün gerekiyor.
          </CardContent>
        </Card>
      )}

      {/* Paneller koşudan önce de duruyor: sonuç alanının sonradan belirmesi
          sayfayı baştan kuruyor ve koşunun neyi ölçeceğini gizliyordu. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Kapı kriteri</span>
            <CriteriaTabs value={criteria} onChange={setCriteria} />
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Referans koşu</span>
            <Select
              value={reference?.completedAt ?? ''}
              onValueChange={setReferenceAt}
              disabled={comparableRuns.length === 0}
            >
              <SelectTrigger className="h-8 w-52" aria-label="Referans koşu">
                <SelectValue placeholder="referans koşu yok" />
              </SelectTrigger>
              <SelectContent>
                {comparableRuns.map((run) => (
                  <SelectItem key={run.completedAt} value={run.completedAt}>
                    {formatRunTime(run.completedAt)}
                    {run.engineVersion ? ` · ${run.engineVersion}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={report === null}
              onClick={downloadReport}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Rapor
            </Button>
          </div>
        </div>

        {/* Geniş ekranda karar ve toplamlar solda, tekil senaryolar ve seri
            sağda: ikisi farklı sorular ve alt alta dizilince sayfa uzuyordu. */}
        <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-w-0 flex-col gap-5">
            <SuiteGatePanel
              gate={report?.gate ?? null}
              criteriaLabel={CRITERIA_LABEL[criteria]}
              referenceLabel={reference ? formatRunTime(reference.completedAt) : null}
            />

            <SectionCard
              title="Kriter toplamları"
              meta={
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {latest
                    ? `tohum ${latest.seed} · ${latest.requestedScenarios} senaryo · motor ${
                        latest.engineVersion ?? '—'
                      } · ${formatRunTime(latest.completedAt)}`
                    : 'koşu bekleniyor'}
                </span>
              }
            >
              <AggregateTable
                run={latest}
                reference={reference}
                selectedCriteria={criteria}
                onSelectCriteria={setCriteria}
              />
            </SectionCard>

            <CriteriaEffectivenessPanel effectiveness={report?.effectiveness ?? []} />
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <SuiteFailurePanel
              run={latest}
              criteria={criteria}
              onInspect={
                latest === null || reproduceBlockedReason
                  ? null
                  : (index) => onInspectScenario(latest, index, criteria)
              }
              reproduceBlockedReason={reproduceBlockedReason}
            />

            <SuiteTrendPanel
              runs={latest ? [latest, ...comparableRuns] : []}
              criteria={criteria}
            />

            {/* Koşu varsa kendi kapsamı gösterilir: kayıt o anki katalogdan
                üretildi, bugünkü katalogla kıyaslamak sonucu yanlış okutur. */}
            <CoveragePanel
              rows={latest ? fromCoverageCounts(latest.coverage) : buildCatalogCoverage(items)}
              source={latest ? 'run' : 'catalog'}
            />
          </div>
        </div>
    </div>
  );
}

/**
 * Koşu başladığından beri geçen süre. Sayaç yalnızca koşu sürerken işler;
 * `runSuite` süre bildirmiyor ve bildirmesi de gerekmiyor — bu tamamen gösterim.
 */
function useElapsedMs(isRunning: boolean): number {
  const startedAtRef = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    const timer = setInterval(() => {
      if (startedAtRef.current !== null) setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning]);

  return elapsedMs;
}

function ProgressCard({ progress, elapsedMs }: { progress: SuiteProgress; elapsedMs: number }) {
  const ratio = progress.total > 0 ? progress.completed / progress.total : 0;
  // Kalan süre tahmini tamamlanan işlerin ortalamasından; ilk iş bitmeden anlamsız.
  const remainingMs =
    progress.completed > 0 && elapsedMs > 0
      ? (elapsedMs / progress.completed) * (progress.total - progress.completed)
      : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-foreground">
            Koşuluyor — senaryo{' '}
            <span className="font-mono tabular-nums">#{progress.currentIndex ?? '—'}</span>
          </span>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {progress.failed > 0 && (
              <span className="text-destructive">{progress.failed} bozuk · </span>
            )}
            {progress.completed} / {progress.total} · geçen {formatDuration(elapsedMs)}
            {remainingMs !== null && ` · kalan ~${formatDuration(remainingMs)}`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Toplu koşu ilerlemesi"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.completed}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}

/** Üretimdeki FilterTabs ile aynı görünüm; animasyon için framer-motion yok. */
function CriteriaTabs({
  value,
  onChange,
}: {
  value: OptimizationCriteria;
  onChange: (criteria: OptimizationCriteria) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
      {CRITERIA_ORDER.map((criteria) => (
        <button
          key={criteria}
          type="button"
          onClick={() => onChange(criteria)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            value === criteria
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {CRITERIA_LABEL[criteria]}
        </button>
      ))}
    </div>
  );
}

interface AggregateTableProps {
  /** Koşu yokken `null`: satırlar boş toplamla çizilir, tablo yerinde durur. */
  run: SuiteRun | null;
  reference: SuiteRun | null;
  selectedCriteria: OptimizationCriteria;
  onSelectCriteria: (criteria: OptimizationCriteria) => void;
}

function AggregateTable({
  run,
  reference,
  selectedCriteria,
  onSelectCriteria,
}: AggregateTableProps) {
  return (
    <div className="-m-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Kriter</th>
            <th className="w-24 px-3 py-2 text-right font-medium">Ort. doluluk</th>
            <th className="hidden w-20 px-3 py-2 text-right font-medium xl:table-cell">Medyan</th>
            <th className="w-20 px-3 py-2 text-right font-medium">En kötü</th>
            <th className="w-24 px-3 py-2 text-right font-medium">Yerleşen</th>
            <th className="hidden w-20 px-3 py-2 text-right font-medium xl:table-cell">Sapma ↓</th>
            <th className="hidden w-28 px-3 py-2 text-right font-medium xl:table-cell">
              LIFO taşma ↓
            </th>
            <th className="w-16 px-3 py-2 text-right font-medium">İhlalli</th>
            <th className="w-14 px-4 py-2 text-right font-medium">Hata</th>
          </tr>
        </thead>
        <tbody>
          {CRITERIA_ORDER.map((criteria) => {
            const row = run ? aggregateFor(run, criteria) : aggregateResults([], criteria);
            const before = reference ? aggregateFor(reference, criteria) : null;
            const isSelected = criteria === selectedCriteria;

            return (
              <tr
                key={criteria}
                onClick={() => onSelectCriteria(criteria)}
                className={cn(
                  'cursor-pointer border-b border-border align-top last:border-b-0',
                  isSelected ? 'bg-accent' : 'hover:bg-muted/50',
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    <span>
                      <span className="font-medium text-foreground">{CRITERIA_LABEL[criteria]}</span>
                      <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">
                        {row.scenarioCount} senaryo · {formatDuration(row.totalDurationMs)}
                      </span>
                    </span>

                    {/* Hangi değişmezin bozulduğu satırın kendisinde dursun;
                        rapordan koda giden yol buradan başlıyor. */}
                    {row.failuresByCheck.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {row.failuresByCheck.map((entry) => (
                          <Badge
                            key={entry.id}
                            variant="destructive"
                            className="px-1.5 py-0 text-[10px] font-normal"
                          >
                            {CHECK_LABEL[entry.id]} ×{entry.scenarios}
                          </Badge>
                        ))}
                      </span>
                    )}

                    <UnplacedReasons reasons={row.unplacedReasons} />
                  </div>
                </td>

                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                  {percent(row.meanFill)}
                  <Delta value={row.meanFill} before={before?.meanFill ?? null} />
                </td>
                <td className="hidden px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground xl:table-cell">
                  {percent(row.medianFill)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                  {percent(row.worstFill)}
                  <Delta value={row.worstFill} before={before?.worstFill ?? null} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                  {percent(row.placedRatio)}
                  <Delta value={row.placedRatio} before={before?.placedRatio ?? null} />
                </td>
                <td className="hidden px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground xl:table-cell">
                  {row.meanBalance !== null ? row.meanBalance.toFixed(1) : '—'}
                </td>
                <td className="hidden px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground xl:table-cell">
                  {row.meanLifoZoneOverflowCm !== null
                    ? `${row.meanLifoZoneOverflowCm.toFixed(0)} cm`
                    : '—'}
                  {row.scenariosWithSoftFailures > 0 && (
                    <span className="block text-[11px] text-state-warn">
                      {row.scenariosWithSoftFailures} senaryo
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                  <Count value={row.scenariosWithFailures} />
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                  <Count value={row.errorCount} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Referansa göre fark. Yön rengi taşır; sayı zaten işaretli. */
function Delta({ value, before }: { value: number | null; before: number | null }) {
  if (value === null || before === null) return null;
  const delta = value - before;
  if (Math.abs(delta) < 0.05) {
    return <span className="block text-[11px] text-muted-foreground">değişmedi</span>;
  }

  return (
    <span className={cn('block text-[11px]', delta > 0 ? 'text-state-pass' : 'text-destructive')}>
      {delta > 0 ? '+' : '−'}
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

/**
 * Korpus genelinde kutuların neden yerleşmediği. Tek senaryoda görünen bu kırılım
 * toplamlarda hiç basılmıyordu; oysa "doluluk neden düştü" sorusunun ilk cevabı
 * burada.
 */
function UnplacedReasons({ reasons }: { reasons: SuiteAggregate['unplacedReasons'] }) {
  if (reasons.length === 0) return null;

  const top = [...reasons].sort((a, b) => b.count - a.count).slice(0, 2);

  return (
    <span className="text-xs text-muted-foreground">
      yerleşemedi:{' '}
      {top
        .map((entry) => `${entry.count} ${UNPLACED_REASON_LABEL[toUnplacedReason(entry.reason)]}`)
        .join(' · ')}
    </span>
  );
}

function Count({ value }: { value: number }) {
  return value > 0 ? (
    <span className="text-destructive">{value}</span>
  ) : (
    <span className="text-muted-foreground">0</span>
  );
}
