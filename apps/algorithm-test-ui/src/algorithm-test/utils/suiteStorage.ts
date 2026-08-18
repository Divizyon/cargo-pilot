import { z } from 'zod';
import { OptimizationCriteria, SequencerKind } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { CHECK_IDS } from '../verification/types';

/**
 * Toplu koşunun sonuçları, toplamları ve sürümler arası karşılaştırması.
 *
 * Tek senaryo bir motor değişikliğinin iyi mi kötü mü olduğunu söyleyemez: bir
 * yükü iyileştiren değişiklik başkasını bozabilir. Cevap ancak çok sayıda
 * senaryonun toplamında çıkar — ortalama doluluk, en kötü durum, kural ihlali
 * olan senaryo sayısı.
 *
 * Karşılaştırma üç koşula bağlı: aynı tohum, aynı katalog VE aynı üretim
 * sürümü. Herhangi biri değişirse üretilen senaryolar da değişir ve
 * karşılaştırılan şey motorun gelişimi değil, girdinin farkı olur.
 */

/** Şema sürümü. Satır zenginleştiğinde artar; eski kayıtlar okunurken düşer. */
export const SUITE_RUN_VERSION = 4;

const sequencerSchema = z.union([
  z.literal(SequencerKind.Static),
  z.literal(SequencerKind.Gwca),
  z.literal(SequencerKind.Ga),
  z.literal(SequencerKind.Grasp),
]);

const criteriaSchema = z.union([
  z.literal(OptimizationCriteria.Lifo),
  z.literal(OptimizationCriteria.WeightBalance),
  z.literal(OptimizationCriteria.VolumeFirst),
]);

const checkIdSchema = z.enum(CHECK_IDS);

/** `UnplacedReason` kodu → adet. Yalnızca sıfır olmayanlar saklanır. */
const unplacedReasonCountSchema = z.object({
  reason: z.number().int(),
  count: z.number().int().nonnegative(),
});

export type UnplacedReasonCount = z.infer<typeof unplacedReasonCountSchema>;

const scenarioResultSchema = z.object({
  index: z.number().int().positive(),
  criteria: criteriaSchema,
  fillPercent: z.number().nullable(),
  placedCount: z.number().int().nonnegative(),
  requestedCount: z.number().int().nonnegative(),
  balanceOffsetX: z.number().nullable(),
  balanceOffsetZ: z.number().nullable(),
  /** Sert kural ihlali sayısı. */
  failedCheckCount: z.number().int().nonnegative(),
  /**
   * Hangi kurallar bozuldu. Sayı tek başına raporu çıkmaz sokağa sokuyordu:
   * "3 senaryoda ihlal var" denip hangi değişmezin bozulduğu söylenmeyince
   * rapordan koda giden yol yoktu.
   */
  failedCheckIds: z.array(checkIdSchema),
  /** Yumuşak kural ihlali (bugün yalnızca LIFO bölge taşması). */
  softFailedCheckCount: z.number().int().nonnegative(),
  /**
   * LIFO bölge taşması (cm). Yumuşak olduğu için ihlal sayılmaz ama LIFO
   * optimizasyonunun kalitesini ölçen tek sayı budur; toplamdan düşerse LIFO
   * kriterinin gerilemesi görünmez olur.
   */
  lifoZoneOverflowCm: z.number().nullable(),
  unplacedReasons: z.array(unplacedReasonCountSchema),
  /** Uçtan uca istek süresi (ms). Motor süresi DEĞİL; ağ ve kalıcılık dahil. */
  durationMs: z.number().nonnegative(),
  /**
   * Senaryonun determinizm izdüşümü (bkz. `suite/determinismDigest.ts`).
   * Süre ve kimlik taşımaz, yalnız yerleşim ve yerleşemeyenler. Koşulamayan
   * senaryoda boş kalır.
   */
  digest: z.string(),
  /**
   * Senaryo koşulamadıysa sebebi. Eskiden düşen senaryo sessizce listeden
   * siliniyordu; motorun belirli bir girdide patlaması "eksik satır" olarak
   * görünüyor, hata sınıfı olarak görünmüyordu.
   */
  error: z.string().nullable(),
});

export type SuiteScenarioResult = z.infer<typeof scenarioResultSchema>;

const checkFailureCountSchema = z.object({
  id: checkIdSchema,
  scenarios: z.number().int().nonnegative(),
});

export type CheckFailureCount = z.infer<typeof checkFailureCountSchema>;

const aggregateSchema = z.object({
  criteria: criteriaSchema,
  /** Ölçüme giren (hatasız) senaryo sayısı. */
  scenarioCount: z.number().int().nonnegative(),
  /** Koşulamayan senaryo sayısı; ölçümlere dahil değil. */
  errorCount: z.number().int().nonnegative(),
  meanFill: z.number().nullable(),
  medianFill: z.number().nullable(),
  worstFill: z.number().nullable(),
  /** Yerleşen kutu / istenen kutu, tüm senaryolar toplamı. */
  placedRatio: z.number().nullable(),
  scenariosWithFailures: z.number().int().nonnegative(),
  failuresByCheck: z.array(checkFailureCountSchema),
  scenariosWithSoftFailures: z.number().int().nonnegative(),
  meanLifoZoneOverflowCm: z.number().nullable(),
  unplacedReasons: z.array(unplacedReasonCountSchema),
  meanBalance: z.number().nullable(),
  totalDurationMs: z.number().nonnegative(),
});

export type SuiteAggregate = z.infer<typeof aggregateSchema>;

const coverageCountSchema = z.object({
  key: z.string(),
  count: z.number().int().nonnegative(),
});

export const suiteRunSchema = z.object({
  version: z.literal(SUITE_RUN_VERSION),
  seed: z.number().int(),
  requestedScenarios: z.number().int().nonnegative(),
  completedAt: z.string(),
  /** Katalog değişmişse aynı tohum başka senaryolar üretir; karşılaştırma geçersiz. */
  catalogSignature: z.string(),
  /** Senaryo üretim mantığının sürümü; değişirse aynı tohum farklı liste verir. */
  generatorVersion: z.number().int(),
  /**
   * Koşunun hangi yerleştirici/sıralayıcı ile alındığı. Farklı strateji farklı
   * bir motordur; aynı seride kıyaslanamaz (bkz. `isComparable`). Aksi hâlde
   * Wall-Builder'ın ilk koşusu greedy referansına karşı sahte regresyon üretirdi.
   */
  sequencer: sequencerSchema,
  /** Arama tohumu; Static sıralayıcıda kullanılmaz ve 0 kalır. */
  searchSeed: z.number().int().nonnegative(),
  /**
   * Fixture modunda kullanılan sentetik katalog sürümü; canlı katalogla koşulan
   * seride null. İmzanın parçasıdır (F1).
   */
  fixtureCatalogVersion: z.number().int().nullable(),
  /**
   * Motorun hangi sürümüne karşı koşuldu (commit/etiket). Elle girilir: backend
   * bunu bildiren bir uç sunmuyor ve uydurmak yanlış rapordan kötüdür.
   */
  engineVersion: z.string().nullable(),
  /** Koşu anındaki katalog kapsaması; hangi dalların test EDİLEBİLİR olduğunu söyler. */
  coverage: z.array(coverageCountSchema),
  /**
   * Koşunun tamamının determinizm damgası. `--repeat` ve SC-45 yalnız bunu
   * karşılaştırır; ham rapor eşitliği aranmaz çünkü süre ve zaman damgası her
   * koşuda zaten farklıdır.
   */
  digest: z.string(),
  results: z.array(scenarioResultSchema),
  aggregates: z.array(aggregateSchema),
});

export type SuiteRun = z.infer<typeof suiteRunSchema>;

const STORAGE_KEY = 'cargo-pilot-algorithm-test-suites';

/** Saklanan azami toplu koşu. Referans seçimi için birkaç koşu elde durmalı. */
const MAX_SUITES = 10;

/**
 * Katalog imzası. Ürün ve araç kimlikleri değişirse aynı tohum başka senaryolar
 * üretir — imza bunu yakalar. Ölçü ya da kısıt değişimini yakalamaz; onlar
 * senaryoyu değil sonucu etkiler, yani zaten ölçmek istediğimiz şeydir.
 */
export function catalogSignature(
  vehicles: readonly Vehicle[],
  items: readonly Item[],
): string {
  const ids = [...vehicles.map((v) => v.id), ...items.map((i) => i.id)].sort().join(',');

  // Kısa ve kararlı bir özet; kriptografik amaç yok, yalnızca eşitlik kıyası.
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    hash = (Math.imul(hash, 31) + ids.charCodeAt(i)) | 0;
  }
  return `${vehicles.length}v${items.length}i${(hash >>> 0).toString(36)}`;
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Kaç senaryoda hangi kural bozuldu; çoktan aza. Sıfırlar listelenmez. */
function countFailuresByCheck(rows: readonly SuiteScenarioResult[]): CheckFailureCount[] {
  const counts = new Map<CheckFailureCount['id'], number>();
  for (const row of rows) {
    // Aynı kural bir senaryoda birden çok kutuyu vursa da senaryo bir kez sayılır.
    for (const id of new Set(row.failedCheckIds)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([id, scenarios]) => ({ id, scenarios }))
    .sort((a, b) => b.scenarios - a.scenarios);
}

function sumUnplacedReasons(rows: readonly SuiteScenarioResult[]): UnplacedReasonCount[] {
  const totals = new Map<number, number>();
  for (const row of rows) {
    for (const entry of row.unplacedReasons) {
      totals.set(entry.reason, (totals.get(entry.reason) ?? 0) + entry.count);
    }
  }
  return [...totals.entries()]
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateResults(
  results: readonly SuiteScenarioResult[],
  criteria: OptimizationCriteria,
): SuiteAggregate {
  const rows = results.filter((r) => r.criteria === criteria);

  // Hata alan satırlar ölçüme girmez: koşulamamış bir senaryoyu %0 doluluk saymak
  // ortalamayı motorun değil sunucunun durumuna bağlar. Ayrıca sayılır ki
  // kaybolmasınlar.
  const ok = rows.filter((r) => r.error === null);

  const fills = ok.map((r) => r.fillPercent).filter((f): f is number => f !== null);

  const balances = ok
    .filter((r) => r.balanceOffsetX !== null && r.balanceOffsetZ !== null)
    .map((r) => (r.balanceOffsetX ?? 0) + (r.balanceOffsetZ ?? 0));

  const overflows = ok
    .map((r) => r.lifoZoneOverflowCm)
    .filter((v): v is number => v !== null);

  const requested = ok.reduce((sum, r) => sum + r.requestedCount, 0);
  const placed = ok.reduce((sum, r) => sum + r.placedCount, 0);

  return {
    criteria,
    scenarioCount: ok.length,
    errorCount: rows.length - ok.length,
    meanFill: mean(fills),
    medianFill: median(fills),
    // En kötü doluluk: motorun en zorlandığı senaryo. Ortalama bunu gizler.
    worstFill: fills.length > 0 ? Math.min(...fills) : null,
    placedRatio: requested > 0 ? (placed / requested) * 100 : null,
    scenariosWithFailures: ok.filter((r) => r.failedCheckCount > 0).length,
    failuresByCheck: countFailuresByCheck(ok),
    scenariosWithSoftFailures: ok.filter((r) => r.softFailedCheckCount > 0).length,
    meanLifoZoneOverflowCm: mean(overflows),
    unplacedReasons: sumUnplacedReasons(ok),
    meanBalance: mean(balances),
    totalDurationMs: rows.reduce((sum, r) => sum + r.durationMs, 0),
  };
}

/** Koşudaki bir kriterin toplamı; kayıtta yoksa satırlardan yeniden hesaplanır. */
export function aggregateFor(run: SuiteRun, criteria: OptimizationCriteria): SuiteAggregate {
  return run.aggregates.find((a) => a.criteria === criteria) ?? aggregateResults(run.results, criteria);
}

export function loadSuites(): SuiteRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const runs = (JSON.parse(raw) as { runs?: unknown }).runs;
    if (!Array.isArray(runs)) return [];

    // Kayıt kayıt ayrıştırılır: şema sürümü atlayan tek bir eski koşu, hâlâ
    // geçerli olan diğerlerini de silmemeli.
    return runs
      .map((run) => suiteRunSchema.safeParse(run))
      .filter((parsed): parsed is { success: true; data: SuiteRun } => parsed.success)
      .map((parsed) => parsed.data);
  } catch {
    return [];
  }
}

export function appendSuite(run: SuiteRun, existing: readonly SuiteRun[]): SuiteRun[] {
  const next = [run, ...existing].slice(0, MAX_SUITES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SUITE_RUN_VERSION, runs: next }));
  } catch {
    // Kota dolu; seri bellekte devam eder. Kalıcı arşiv için JSON dışa aktarma var.
  }
  return next;
}

export function clearSuites(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Yukarıdakiyle aynı gerekçe.
  }
}

/**
 * İki koşu birebir aynı senaryo setini VE aynı motoru gördü mü.
 *
 * Strateji/sıralayıcı anahtarın parçasıdır: farklı strateji bir gerileme değil,
 * başka bir motordur. Strateji karşılaştırması göreli kapıya değil, eşleştirilmiş
 * kıyas protokolüne gider (docs/algorithm/01-kurallar.md KK-03).
 */
export function isComparable(a: SuiteRun, b: SuiteRun): boolean {
  return (
    a.version === b.version &&
    a.seed === b.seed &&
    a.catalogSignature === b.catalogSignature &&
    a.generatorVersion === b.generatorVersion &&
    a.fixtureCatalogVersion === b.fixtureCatalogVersion &&
    a.sequencer === b.sequencer &&
    a.searchSeed === b.searchSeed
  );
}

export interface SuiteComparison {
  meanFill: number | null;
  worstFill: number | null;
  placedRatio: number | null;
  meanBalance: number | null;
  lifoZoneOverflowCm: number | null;
  /** İhlalli senaryo sayısındaki değişim; pozitif = kötüleşme. */
  failures: number;
  /** Koşulamayan senaryo sayısındaki değişim. */
  errors: number;
  /** Doluluğu artan / azalan senaryo sayısı; ortalamanın gizlediği dağılım. */
  improved: number;
  regressed: number;
  unchanged: number;
  /** Önce temizken şimdi kural bozan senaryolar; kapının en sert sinyali. */
  newlyFailing: number[];
  /** Önce bozukken şimdi temiz olanlar. */
  newlyFixed: number[];
}

/** Doluluk farkının anlamlı sayılacağı alt sınır (yüzde puanı). */
const FILL_NOISE_FLOOR_PT = 0.05;

export function compareSuites(
  current: SuiteRun,
  previous: SuiteRun,
  criteria: OptimizationCriteria,
): SuiteComparison {
  const now = aggregateResults(current.results, criteria);
  const before = aggregateResults(previous.results, criteria);

  const delta = (a: number | null, b: number | null) => (a !== null && b !== null ? a - b : null);

  const previousByIndex = new Map(
    previous.results.filter((r) => r.criteria === criteria).map((r) => [r.index, r]),
  );

  let improved = 0;
  let regressed = 0;
  let unchanged = 0;
  const newlyFailing: number[] = [];
  const newlyFixed: number[] = [];

  for (const row of current.results.filter((r) => r.criteria === criteria)) {
    const earlier = previousByIndex.get(row.index);
    if (!earlier) continue;

    if (row.failedCheckCount > 0 && earlier.failedCheckCount === 0) newlyFailing.push(row.index);
    if (row.failedCheckCount === 0 && earlier.failedCheckCount > 0) newlyFixed.push(row.index);

    if (row.fillPercent === null || earlier.fillPercent === null) continue;

    const change = row.fillPercent - earlier.fillPercent;
    if (change > FILL_NOISE_FLOOR_PT) improved += 1;
    else if (change < -FILL_NOISE_FLOOR_PT) regressed += 1;
    else unchanged += 1;
  }

  return {
    meanFill: delta(now.meanFill, before.meanFill),
    worstFill: delta(now.worstFill, before.worstFill),
    placedRatio: delta(now.placedRatio, before.placedRatio),
    meanBalance: delta(now.meanBalance, before.meanBalance),
    lifoZoneOverflowCm: delta(now.meanLifoZoneOverflowCm, before.meanLifoZoneOverflowCm),
    failures: now.scenariosWithFailures - before.scenariosWithFailures,
    errors: now.errorCount - before.errorCount,
    improved,
    regressed,
    unchanged,
    newlyFailing: newlyFailing.sort((a, b) => a - b),
    newlyFixed: newlyFixed.sort((a, b) => a - b),
  };
}
