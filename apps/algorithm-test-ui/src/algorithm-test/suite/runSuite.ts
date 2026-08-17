import { fromApiPlanDetail, planDetailResponseSchema } from '@/lib/api/loadingPlanMappers';
import type { Item } from '@/lib/types/item';
import type { OptimizationCriteria, Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { CRITERIA_ORDER } from '../criteria';
import { PlacementStrategy, SequencerKind } from '@/lib/types/loadingPlan';
import { runDigest, scenarioDigest } from './determinismDigest';
import { buildCatalogCoverage, toCoverageCounts } from '../utils/catalogCoverage';
import { GENERATOR_VERSION, generateSuite, type SuiteScenario } from '../utils/suiteGenerator';
import {
  SUITE_RUN_VERSION,
  aggregateResults,
  catalogSignature,
  type SuiteRun,
  type SuiteScenarioResult,
  type UnplacedReasonCount,
} from '../utils/suiteStorage';
import { toUnplacedReason } from '../utils/unplacedReason';
import { CONTACT_EPSILON_CM } from '../verification/geometryPredicates';
import { computeGroupZones, measureZoneOverflow } from '../verification/lifoZones';
import { runChecks, summarizeChecks } from '../verification/runChecks';
import { describeRequestError, type SuiteClient } from './suiteClient';

/**
 * Tohumlu senaryo setini her kriterle koşturan motor.
 *
 * Tek senaryo bir motor değişikliğinin yönünü söyleyemez — bir yükü iyileştiren
 * değişiklik başkasını bozabilir. Toplu koşu bu yüzden var: aynı tohumla
 * üretilmiş onlarca senaryonun ortalaması, en kötüsü ve kaç senaryoda gerilediği
 * motorun gerçek gidişatını verir.
 *
 * React'ten bağımsız: hook da komut satırı aracı da AYNI kod yolunu kullanır.
 * Ayrı yollar olsaydı ekranda gördüğünüz sayı ile CI'ın ürettiği rapor sessizce
 * ayrışırdı.
 *
 * Oluşturulan plan kayıtları sonuç okunur okunmaz silinir (soft-delete); yüz
 * senaryo × üç kriter paylaşılan veritabanına üç yüz kayıt bırakırdı.
 */

/**
 * Sunucuya aynı anda gönderilecek azami istek. Optimizasyon istek içinde senkron
 * çalıştığı için yüksek eşzamanlılık sunucuyu boğar ve ölçülen süreyi de
 * anlamsızlaştırır; 4 hem makul hızda hem nazik.
 */
const DEFAULT_CONCURRENCY = 4;

export interface SuiteProgress {
  completed: number;
  total: number;
  /** Şu an koşulan senaryonun sırası; gösterim için. */
  currentIndex: number | null;
  /**
   * O ana kadar ihlalli ya da hatalı biten iş sayısı. Uzun koşularda sonucun
   * bozulduğunu bitişi beklemeden görmek için — koşu kararını değiştirmez.
   */
  failed: number;
}

/** Saat dışarıdan verilebilir; testler zamandan bağımsız kalsın diye. */
export interface SuiteClock {
  nowIso(): string;
  monotonicMs(): number;
}

const systemClock: SuiteClock = {
  nowIso: () => new Date().toISOString(),
  monotonicMs: () => performance.now(),
};

export interface RunSuiteOptions {
  seed: number;
  count: number;
  vehicles: readonly Vehicle[];
  items: readonly Item[];
  client: SuiteClient;
  concurrency?: number;
  criteriaList?: readonly OptimizationCriteria[];
  /** Motorun hangi sürümüne karşı koşulduğu; rapora yazılır. */
  engineVersion?: string | null;
  /** Hangi yerleştirici koşsun. Varsayılan bugünkü greedy motor. */
  strategy?: PlacementStrategy;
  /** Kutu sırasını kim üretsin. Varsayılan bugünkü kriter tabanlı sıralama. */
  sequencer?: SequencerKind;
  /** Arama tohumu; Static sıralayıcıda kullanılmaz. */
  searchSeed?: number;
  /** Fixture modunda sentetik katalog sürümü; canlı katalogda null (F1). */
  fixtureCatalogVersion?: number | null;
  onProgress?: (progress: SuiteProgress) => void;
  /**
   * Sert kural ihlali olan senaryoyu dışarı verir. Rapor yalnız sayı taşır;
   * bozuk vakayı incelemek için gereken şey (girdi + yerleşim) rapora
   * sığmıyor ve koşu bittiğinde kayboluyordu.
   */
  onScenarioFailure?: (failure: ScenarioFailure) => void;
  shouldCancel?: () => boolean;
  clock?: SuiteClock;
}

/** Bozuk vakanın diske yazılabilir tam görüntüsü. */
export interface ScenarioFailure {
  scenarioIndex: number;
  criteria: OptimizationCriteria;
  failedCheckIds: string[];
  checkDetails: Array<{ id: string; status: string; detail?: string; failedPlacementIndices: number[] }>;
  planBody: unknown;
  placements: Placement[];
  unplaced: Array<{ itemId: string; quantity: number; reason: number }>;
}

export type RunSuiteOutcome =
  | { status: 'ok'; run: SuiteRun }
  /** Katalogda araç ya da ürün yok; senaryo üretilemedi. */
  | { status: 'empty-catalog' }
  /**
   * Koşu yarıda kesildi. Kısmi sonuç KAYDEDİLMEZ: eksik senaryo setinin
   * ortalaması tam bir koşuyla karşılaştırılırsa fark motorun değil örneklem
   * büyüklüğünün farkı olur.
   */
  | { status: 'cancelled' }
  /** Hiçbir senaryo tamamlanamadı; sunucuya erişilemiyor olabilir. */
  | { status: 'no-results' };

/** Koşunun tamamı için sabit motor seçimi; her senaryoya aynen geçer. */
interface EngineSelection {
  readonly strategy: PlacementStrategy;
  readonly sequencer: SequencerKind;
  readonly searchSeed: number;
}

/** Motor `groupId` olarak uuid bekliyor; senaryo yalnızca grup numarası taşır. */
function mintGroupIds(scenario: SuiteScenario): Map<number, string> {
  const numbers = [...new Set(scenario.items.map((i) => i.groupNumber))].filter((n) => n > 0);
  return new Map(numbers.map((n) => [n, crypto.randomUUID()]));
}

function buildPlanBody(
  scenario: SuiteScenario,
  criteria: OptimizationCriteria,
  groupIdByNumber: ReadonlyMap<number, string>,
  engine: EngineSelection,
): unknown {
  return {
    vehicleId: scenario.vehicleId,
    optimizationCriteria: criteria,
    clusterGroups: scenario.clusterGroups,
    placementStrategy: engine.strategy,
    sequencer: engine.sequencer,
    seed: engine.searchSeed,
    planName: `Toplu Test #${scenario.index} K${criteria}`,
    items: scenario.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      groupId: groupIdByNumber.get(i.groupNumber),
    })),
    groups: [...groupIdByNumber.entries()].map(([number, id]) => ({
      clientGroupId: id,
      name: `G${number}`,
      color: '#64748B',
      unloadingOrder: number,
    })),
  };
}

function summarizeUnplaced(
  unplacedItems: readonly { quantity: number; reason: number }[],
): UnplacedReasonCount[] {
  const totals = new Map<number, number>();
  for (const unplaced of unplacedItems) {
    const reason = toUnplacedReason(unplaced.reason);
    totals.set(reason, (totals.get(reason) ?? 0) + unplaced.quantity);
  }
  return [...totals.entries()]
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

function errorResult(
  scenario: SuiteScenario,
  criteria: OptimizationCriteria,
  durationMs: number,
  error: string,
): SuiteScenarioResult {
  return {
    index: scenario.index,
    criteria,
    fillPercent: null,
    placedCount: 0,
    requestedCount: scenario.totalBoxes,
    balanceOffsetX: null,
    balanceOffsetZ: null,
    failedCheckCount: 0,
    failedCheckIds: [],
    softFailedCheckCount: 0,
    lifoZoneOverflowCm: null,
    unplacedReasons: [],
    durationMs,
    digest: '',
    error,
  };
}

async function runScenario(
  scenario: SuiteScenario,
  criteria: OptimizationCriteria,
  itemsById: Map<string, Item>,
  client: SuiteClient,
  clock: SuiteClock,
  engine: EngineSelection,
  onFailure?: (failure: ScenarioFailure) => void,
): Promise<SuiteScenarioResult> {
  const groupIdByNumber = mintGroupIds(scenario);
  const start = clock.monotonicMs();
  let planId: string | null = null;
  let planBody: unknown = null;

  try {
    planBody = buildPlanBody(scenario, criteria, groupIdByNumber, engine);
    planId = await client.createPlan(planBody);
    if (!planId) {
      return errorResult(scenario, criteria, clock.monotonicMs() - start, 'Plan kimliği dönmedi');
    }

    const parsed = planDetailResponseSchema.safeParse(await client.getPlanDetail(planId));
    if (!parsed.success) {
      return errorResult(
        scenario,
        criteria,
        clock.monotonicMs() - start,
        'Plan sonucu ayrıştırılamadı',
      );
    }

    const detail = fromApiPlanDetail(parsed.data.data);
    const durationMs = clock.monotonicMs() - start;

    const unloadingOrderByItemId = new Map(scenario.items.map((i) => [i.itemId, i.groupNumber]));

    const zones = detail.vehicle
      ? computeGroupZones(
          [...groupIdByNumber.keys()],
          detail.vehicle.length,
          detail.vehicle.doors,
          criteria,
        )
      : [];

    const { centerOfGravityX, centerOfGravityY, centerOfGravityZ } = detail.metrics;
    const requestedCount = scenario.items.reduce((sum, i) => sum + i.quantity, 0);
    const unplacedCount = detail.unplacedItems.reduce((sum, u) => sum + u.quantity, 0);

    const checks = runChecks({
      placements: detail.placements,
      vehicle: detail.vehicle,
      criteria,
      zones,
      backendCog:
        centerOfGravityX !== null && centerOfGravityY !== null && centerOfGravityZ !== null
          ? { x: centerOfGravityX, y: centerOfGravityY, z: centerOfGravityZ }
          : null,
      backendBalanceOffsetX: detail.metrics.weightBalanceOffsetX,
      backendBalanceOffsetZ: detail.metrics.weightBalanceOffsetZ,
      requestedCount,
      unplacedCount,
      backendPlacedQuantity: detail.metrics.placedQuantity,
      itemsById,
      unloadingOrderByItemId,
    });

    const summary = summarizeChecks(checks);

    if (summary.fail > 0) {
      onFailure?.({
        scenarioIndex: scenario.index,
        criteria,
        failedCheckIds: checks
          .filter((check) => check.status === 'fail' && check.severity === 'hard')
          .map((check) => check.id),
        checkDetails: checks
          .filter((check) => check.status === 'fail')
          .map((check) => ({
            id: check.id,
            status: check.status,
            detail: check.detail,
            failedPlacementIndices: check.failedPlacementIndices,
          })),
        planBody,
        placements: detail.placements,
        unplaced: detail.unplacedItems.map((u) => ({
          itemId: u.itemId,
          quantity: u.quantity,
          reason: u.reason,
        })),
      });
    }

    return {
      index: scenario.index,
      criteria,
      fillPercent: detail.metrics.fillRate !== null ? detail.metrics.fillRate * 100 : null,
      placedCount: detail.metrics.placedQuantity ?? detail.placements.length,
      requestedCount,
      balanceOffsetX: detail.metrics.weightBalanceOffsetX,
      balanceOffsetZ: detail.metrics.weightBalanceOffsetZ,
      failedCheckCount: summary.fail,
      failedCheckIds: checks
        .filter((check) => check.status === 'fail' && check.severity === 'hard')
        .map((check) => check.id),
      softFailedCheckCount: summary.softFail,
      // Bölge oluşmadıysa ölçüm yok; 0 yazmak "taşma olmadı" yalanı olurdu.
      lifoZoneOverflowCm:
        zones.length > 0
          ? measureZoneOverflow(
              detail.placements,
              zones,
              unloadingOrderByItemId,
              CONTACT_EPSILON_CM,
            ).totalOverflowCm
          : null,
      unplacedReasons: summarizeUnplaced(detail.unplacedItems),
      durationMs,
      digest: await scenarioDigest(
        `${scenario.index}-k${criteria}`,
        detail.placements,
        detail.unplacedItems,
      ),
      error: null,
    };
  } catch (error) {
    return errorResult(scenario, criteria, clock.monotonicMs() - start, describeRequestError(error));
  } finally {
    // Sonuç okunduktan sonra kaydı temizle. Başarısız olursa sessiz geç: ölçüm
    // zaten alınmış, temizlik uğruna koşuyu bozmaya değmez.
    if (planId) await client.deletePlan(planId).catch(() => undefined);
  }
}

export async function runSuite(options: RunSuiteOptions): Promise<RunSuiteOutcome> {
  const {
    seed,
    count,
    vehicles,
    items,
    client,
    concurrency = DEFAULT_CONCURRENCY,
    criteriaList = CRITERIA_ORDER,
    engineVersion = null,
    strategy = PlacementStrategy.Greedy,
    sequencer = SequencerKind.Static,
    searchSeed = 0,
    fixtureCatalogVersion = null,
    onProgress,
    onScenarioFailure,
    shouldCancel,
    clock = systemClock,
  } = options;

  const engine: EngineSelection = { strategy, sequencer, searchSeed };

  const scenarios = generateSuite(seed, count, vehicles, items);
  if (scenarios.length === 0) return { status: 'empty-catalog' };

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const jobs = scenarios.flatMap((scenario) =>
    criteriaList.map((criteria) => ({ scenario, criteria })),
  );

  onProgress?.({ completed: 0, total: jobs.length, currentIndex: null, failed: 0 });

  const results: SuiteScenarioResult[] = [];
  let cursor = 0;
  let completed = 0;
  let failed = 0;

  // Sabit sayıda işçi kuyruktan çeker; hepsini birden salmak sunucuyu boğar ve
  // süre ölçümünü anlamsızlaştırır.
  const worker = async () => {
    while (cursor < jobs.length && shouldCancel?.() !== true) {
      const job = jobs[cursor++];
      onProgress?.({ completed, total: jobs.length, currentIndex: job.scenario.index, failed });

      const result = await runScenario(
        job.scenario, job.criteria, itemsById, client, clock, engine, onScenarioFailure,
      );
      results.push(result);

      completed += 1;
      if (result.failedCheckCount > 0 || result.error !== null) failed += 1;
      onProgress?.({ completed, total: jobs.length, currentIndex: job.scenario.index, failed });
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  if (shouldCancel?.() === true) return { status: 'cancelled' };
  if (results.length === 0) return { status: 'no-results' };

  // İşçiler kuyruktan sırasız çektiği için satır sırası koşudan koşuya değişiyor.
  // Sıralamak raporları karşılaştırılabilir kılar: iki koşunun JSON farkı yalnızca
  // gerçekten değişen ölçümleri gösterir.
  results.sort((a, b) => a.index - b.index || a.criteria - b.criteria);

  return {
    status: 'ok',
    run: {
      version: SUITE_RUN_VERSION,
      seed,
      requestedScenarios: scenarios.length,
      completedAt: clock.nowIso(),
      catalogSignature: catalogSignature(vehicles, items),
      generatorVersion: GENERATOR_VERSION,
      strategy,
      sequencer,
      searchSeed,
      fixtureCatalogVersion,
      engineVersion,
      coverage: toCoverageCounts(buildCatalogCoverage(items)),
      digest: await runDigest(
        results.map((r) => ({ scenarioId: `${r.index}-k${r.criteria}`, digest: r.digest })),
      ),
      results,
      aggregates: criteriaList.map((criteria) => aggregateResults(results, criteria)),
    },
  };
}
