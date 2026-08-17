import { afterEach, describe, expect, it, vi } from 'vitest';
import { OptimizationCriteria, PlacementStrategy, SequencerKind } from '@/lib/types/loadingPlan';
import {
  SUITE_RUN_VERSION,
  aggregateResults,
  appendSuite,
  catalogSignature,
  compareSuites,
  isComparable,
  loadSuites,
  type SuiteRun,
  type SuiteScenarioResult,
} from './suiteStorage';

const VF = OptimizationCriteria.VolumeFirst;
const WB = OptimizationCriteria.WeightBalance;

function result(overrides: Partial<SuiteScenarioResult> = {}): SuiteScenarioResult {
  return {
    index: 1,
    criteria: VF,
    fillPercent: 60,
    placedCount: 90,
    requestedCount: 100,
    balanceOffsetX: 10,
    balanceOffsetZ: 20,
    failedCheckCount: 0,
    failedCheckIds: [],
    softFailedCheckCount: 0,
    lifoZoneOverflowCm: null,
    unplacedReasons: [],
    durationMs: 500,
    digest: 'x',
    error: null,
    ...overrides,
  };
}

function suite(overrides: Partial<SuiteRun> = {}): SuiteRun {
  return {
    version: SUITE_RUN_VERSION,
    seed: 42,
    requestedScenarios: 3,
    completedAt: '2026-08-15T10:00:00.000Z',
    catalogSignature: 'sig-a',
    generatorVersion: 2,
    strategy: PlacementStrategy.Greedy,
    sequencer: SequencerKind.Static,
    searchSeed: 0,
    fixtureCatalogVersion: null,
    engineVersion: null,
    coverage: [],
    digest: 'run',
    results: [],
    aggregates: [],
    ...overrides,
  };
}

describe('aggregateResults', () => {
  const results = [
    result({ index: 1, fillPercent: 50 }),
    result({ index: 2, fillPercent: 60 }),
    result({ index: 3, fillPercent: 70, failedCheckCount: 2, failedCheckIds: ['overlap', 'bounds'] }),
    result({ index: 4, criteria: WB, fillPercent: 10 }),
  ];

  it('yalnızca istenen kriterin satırlarını toplar', () => {
    const aggregate = aggregateResults(results, VF);
    expect(aggregate.scenarioCount).toBe(3);
    expect(aggregate.meanFill).toBeCloseTo(60);
  });

  // Ortalama, motorun en zorlandığı senaryoyu gizler; en kötü ayrıca durmalı.
  it('en kötü doluluğu ayrı raporlar', () => {
    expect(aggregateResults(results, VF).worstFill).toBe(50);
  });

  it('medyanı çift sayıda örnekte ortalar', () => {
    const even = [result({ fillPercent: 10 }), result({ fillPercent: 20 })];
    expect(aggregateResults(even, VF).medianFill).toBe(15);
  });

  it('yerleşen oranını toplam üzerinden hesaplar', () => {
    expect(aggregateResults(results, VF).placedRatio).toBeCloseTo(90);
  });

  it('kural ihlali olan senaryoları sayar', () => {
    expect(aggregateResults(results, VF).scenariosWithFailures).toBe(1);
  });

  it('doluluk hiç bildirilmemişse null döner, sıfır uydurmaz', () => {
    const blank = [result({ fillPercent: null }), result({ fillPercent: null })];
    const aggregate = aggregateResults(blank, VF);
    expect(aggregate.meanFill).toBeNull();
    expect(aggregate.worstFill).toBeNull();
  });

  it('eşleşen satır yoksa boş toplam döner', () => {
    const aggregate = aggregateResults([], VF);
    expect(aggregate.scenarioCount).toBe(0);
    expect(aggregate.meanFill).toBeNull();
  });

  /**
   * Koşulamamış senaryoyu %0 doluluk saymak ortalamayı motorun değil sunucunun
   * durumuna bağlardı: ağ hatası "motor geriledi" gibi görünürdü.
   */
  it('hata alan satırları ölçüme katmaz ama ayrıca sayar', () => {
    const withError = [
      result({ index: 1, fillPercent: 80 }),
      result({ index: 2, fillPercent: null, placedCount: 0, error: 'HTTP 500' }),
    ];
    const aggregate = aggregateResults(withError, VF);

    expect(aggregate.scenarioCount).toBe(1);
    expect(aggregate.errorCount).toBe(1);
    expect(aggregate.meanFill).toBeCloseTo(80);
    expect(aggregate.placedRatio).toBeCloseTo(90);
  });

  // "3 senaryoda ihlal var" tek başına rapordan koda giden yolu vermiyor.
  it('hangi kuralın kaç senaryoda bozulduğunu ayırır', () => {
    const rows = [
      result({ index: 1, failedCheckCount: 1, failedCheckIds: ['overlap'] }),
      result({ index: 2, failedCheckCount: 2, failedCheckIds: ['overlap', 'support'] }),
    ];
    expect(aggregateResults(rows, VF).failuresByCheck).toEqual([
      { id: 'overlap', scenarios: 2 },
      { id: 'support', scenarios: 1 },
    ]);
  });

  it('aynı kural bir senaryoda tekrarlansa da senaryoyu bir kez sayar', () => {
    const rows = [result({ index: 1, failedCheckIds: ['overlap', 'overlap'] })];
    expect(aggregateResults(rows, VF).failuresByCheck).toEqual([{ id: 'overlap', scenarios: 1 }]);
  });

  it('yerleşememe sebeplerini toplar ve çoktan aza sıralar', () => {
    const rows = [
      result({ index: 1, unplacedReasons: [{ reason: 1, count: 5 }] }),
      result({
        index: 2,
        unplacedReasons: [
          { reason: 1, count: 3 },
          { reason: 2, count: 20 },
        ],
      }),
    ];
    expect(aggregateResults(rows, VF).unplacedReasons).toEqual([
      { reason: 2, count: 20 },
      { reason: 1, count: 8 },
    ]);
  });

  // Bölge oluşmayan koşularda taşma "0" değil "ölçülmedi"dir.
  it('LIFO taşmasını yalnızca ölçülen satırlardan ortalar', () => {
    const rows = [
      result({ index: 1, lifoZoneOverflowCm: 100 }),
      result({ index: 2, lifoZoneOverflowCm: null }),
      result({ index: 3, lifoZoneOverflowCm: 200 }),
    ];
    expect(aggregateResults(rows, VF).meanLifoZoneOverflowCm).toBeCloseTo(150);
  });
});

describe('catalogSignature', () => {
  it('aynı katalog aynı imzayı verir', () => {
    const vehicles = [{ id: 'v1' }, { id: 'v2' }] as never;
    const items = [{ id: 'a' }, { id: 'b' }] as never;
    expect(catalogSignature(vehicles, items)).toBe(catalogSignature(vehicles, items));
  });

  it('ürün eklenince imza değişir', () => {
    const vehicles = [{ id: 'v1' }] as never;
    expect(catalogSignature(vehicles, [{ id: 'a' }] as never)).not.toBe(
      catalogSignature(vehicles, [{ id: 'a' }, { id: 'b' }] as never),
    );
  });
});

describe('compareSuites', () => {
  const previous = suite({
    completedAt: '2026-08-15T10:00:00.000Z',
    results: [
      result({ index: 1, fillPercent: 50 }),
      result({ index: 2, fillPercent: 60 }),
      result({ index: 3, fillPercent: 70 }),
    ],
  });

  const current = suite({
    completedAt: '2026-08-15T12:00:00.000Z',
    results: [
      result({ index: 1, fillPercent: 55 }),
      result({ index: 2, fillPercent: 60 }),
      result({ index: 3, fillPercent: 65 }),
    ],
  });

  it('ortalama doluluk farkını verir', () => {
    expect(compareSuites(current, previous, VF).meanFill).toBeCloseTo(0);
  });

  /**
   * Asıl mesele bu: ortalama değişmemiş görünürken bir senaryo iyileşip başkası
   * gerilemiş olabilir. Dağılım gösterilmezse motor "durağan" sanılır.
   */
  it('ortalama sabitken bile iyileşen ve gerileyen senaryoları ayırır', () => {
    const comparison = compareSuites(current, previous, VF);
    expect(comparison.improved).toBe(1);
    expect(comparison.regressed).toBe(1);
    expect(comparison.unchanged).toBe(1);
  });

  it('senaryolar sıraya göre eşleşir, konuma göre değil', () => {
    const shuffled = suite({
      completedAt: '2026-08-15T13:00:00.000Z',
      results: [
        result({ index: 3, fillPercent: 65 }),
        result({ index: 1, fillPercent: 55 }),
        result({ index: 2, fillPercent: 60 }),
      ],
    });
    expect(compareSuites(shuffled, previous, VF)).toEqual(compareSuites(current, previous, VF));
  });

  it('kural ihlali artışını pozitif verir', () => {
    const worse = suite({
      completedAt: '2026-08-15T14:00:00.000Z',
      results: [result({ index: 1, fillPercent: 50, failedCheckCount: 3 })],
    });
    expect(compareSuites(worse, previous, VF).failures).toBe(1);
  });

  it('önceki koşuda olmayan senaryoyu saymaz', () => {
    const extra = suite({
      completedAt: '2026-08-15T15:00:00.000Z',
      results: [result({ index: 99, fillPercent: 80 })],
    });
    const comparison = compareSuites(extra, previous, VF);
    expect(comparison.improved + comparison.regressed + comparison.unchanged).toBe(0);
  });

  /**
   * Kapının en sert sinyali: ihlal SAYISI aynı kalsa bile başka bir senaryonun
   * bozulmuş olması gerilemedir. Toplam sayıya bakan bir kapı bunu kaçırırdı.
   */
  it('yeni bozulan ve düzelen senaryoları ayrı listeler', () => {
    const before = suite({
      completedAt: '2026-08-15T10:00:00.000Z',
      results: [
        result({ index: 1, failedCheckCount: 1, failedCheckIds: ['overlap'] }),
        result({ index: 2, failedCheckCount: 0 }),
      ],
    });
    const after = suite({
      completedAt: '2026-08-15T12:00:00.000Z',
      results: [
        result({ index: 1, failedCheckCount: 0 }),
        result({ index: 2, failedCheckCount: 1, failedCheckIds: ['support'] }),
      ],
    });

    const comparison = compareSuites(after, before, VF);
    expect(comparison.failures).toBe(0);
    expect(comparison.newlyFailing).toEqual([2]);
    expect(comparison.newlyFixed).toEqual([1]);
  });
});

describe('loadSuites', () => {
  const store = new Map<string, string>();

  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });

  afterEach(() => store.clear());

  it('kaydedilen koşuları geri okur', () => {
    appendSuite(suite(), []);
    expect(loadSuites().map((run) => run.seed)).toEqual([42]);
  });

  /**
   * Tek bozuk kayıt tüm seriyi silmemeli: şema sürümü atlandığında aylarca
   * biriken ölçüm bir anda kaybolurdu.
   */
  it('şemaya uymayan kaydı atar, geçerlileri korur', () => {
    const valid = suite({ seed: 7 });
    store.set(
      'cargo-pilot-algorithm-test-suites',
      JSON.stringify({ version: SUITE_RUN_VERSION, runs: [{ version: 1, seed: 1 }, valid] }),
    );

    expect(loadSuites().map((run) => run.seed)).toEqual([7]);
  });
});

describe('isComparable', () => {
  const current = suite();

  it('aynı tohum, katalog ve üretim sürümünde eşleşir', () => {
    expect(isComparable(suite({ completedAt: '2026-08-01T10:00:00.000Z' }), current)).toBe(true);
  });

  /**
   * Üçünden biri değişince aynı tohum başka senaryolar üretir. Sessizce
   * karşılaştırmak, motor değişmemişken "gerileme" raporlardı.
   */
  it.each([
    ['tohum', { seed: 99 }],
    ['katalog', { catalogSignature: 'sig-b' }],
    ['üretim sürümü', { generatorVersion: 1 }],
  ])('%s farklıysa eşleşmez', (_label, overrides) => {
    expect(isComparable(suite(overrides), current)).toBe(false);
  });
});
