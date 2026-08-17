import { describe, expect, it } from 'vitest';
import { OptimizationCriteria, PlacementStrategy, SequencerKind } from '@/lib/types/loadingPlan';
import { SUITE_RUN_VERSION, type SuiteRun, type SuiteScenarioResult } from '../utils/suiteStorage';
import type { EffectivenessResult } from './criteriaEffectiveness';
import { evaluateGate, type GateViolationId } from './regressionGate';

/**
 * Kapı, raporu tek bir çıkış koduna indirger. Testler iki şeyi ayırıyor:
 * geçmişe ihtiyaç duymayan MUTLAK kurallar (ilk koşu bile kalabilir) ve
 * karşılaştırma gerektiren GÖRELİ kurallar.
 */

const VF = OptimizationCriteria.VolumeFirst;

function result(overrides: Partial<SuiteScenarioResult> = {}): SuiteScenarioResult {
  return {
    index: 1,
    criteria: VF,
    fillPercent: 70,
    placedCount: 10,
    requestedCount: 10,
    balanceOffsetX: 5,
    balanceOffsetZ: 5,
    failedCheckCount: 0,
    failedCheckIds: [],
    softFailedCheckCount: 0,
    lifoZoneOverflowCm: null,
    unplacedReasons: [],
    durationMs: 1,
    digest: 'x',
    error: null,
    ...overrides,
  };
}

function run(results: SuiteScenarioResult[], overrides: Partial<SuiteRun> = {}): SuiteRun {
  return {
    version: SUITE_RUN_VERSION,
    seed: 1,
    requestedScenarios: results.length,
    completedAt: '2026-08-15T12:00:00.000Z',
    catalogSignature: 'sig',
    generatorVersion: 2,
    strategy: PlacementStrategy.Greedy,
    sequencer: SequencerKind.Static,
    searchSeed: 0,
    fixtureCatalogVersion: null,
    engineVersion: null,
    coverage: [],
    digest: 'run',
    results,
    aggregates: [],
    ...overrides,
  };
}

function ids(violations: readonly { id: GateViolationId }[]): GateViolationId[] {
  return violations.map((violation) => violation.id);
}

const clean = run([result({ index: 1 }), result({ index: 2 })]);

describe('evaluateGate — mutlak kurallar', () => {
  it('temiz koşu referanssız da geçer', () => {
    const gate = evaluateGate({ run: clean, criteria: VF });
    expect(gate.passed).toBe(true);
    expect(gate.comparedTo).toBeNull();
    expect(gate.comparison).toBeNull();
  });

  // İlk koşu bile sert kural ihlali içeriyorsa kabul edilmemeli.
  it('sert kural ihlali kapıyı düşürür', () => {
    const gate = evaluateGate({
      run: run([result({ index: 1, failedCheckCount: 1, failedCheckIds: ['overlap'] })]),
      criteria: VF,
    });
    expect(gate.passed).toBe(false);
    expect(ids(gate.violations)).toContain('hardFailures');
    expect(gate.violations[0].detail).toContain('overlap');
  });

  it('koşulamayan senaryo kapıyı düşürür', () => {
    const gate = evaluateGate({
      run: run([result({ index: 1, error: 'HTTP 500', fillPercent: null })]),
      criteria: VF,
    });
    expect(ids(gate.violations)).toContain('errors');
  });

  it('eşik gevşetilirse ihlalli koşu geçebilir', () => {
    const gate = evaluateGate({
      run: run([result({ index: 1, failedCheckCount: 1, failedCheckIds: ['overlap'] })]),
      criteria: VF,
      thresholds: { allowHardFailures: true },
    });
    expect(gate.passed).toBe(true);
  });

  it('kriter etkinliği kalırsa kapı düşer', () => {
    const failing: EffectivenessResult = {
      id: 'volumeFirstFill',
      label: 'Hacim Önceliği doluluğu',
      expectation: 'beklenti',
      verdict: 'fail',
      detail: 'ayrıntı',
    };
    const gate = evaluateGate({ run: clean, criteria: VF, effectiveness: [failing] });
    expect(ids(gate.violations)).toContain('effectiveness');
  });

  it('ölçülemeyen etkinlik iddiası ihlal sayılmaz', () => {
    const unknown: EffectivenessResult = {
      id: 'volumeFirstFill',
      label: 'Hacim Önceliği doluluğu',
      expectation: 'beklenti',
      verdict: 'inconclusive',
      detail: 'yeterli ölçüm yok',
    };
    expect(evaluateGate({ run: clean, criteria: VF, effectiveness: [unknown] }).passed).toBe(true);
  });
});

describe('evaluateGate — göreli kurallar', () => {
  const previous = run([result({ index: 1, fillPercent: 70 }), result({ index: 2, fillPercent: 70 })], {
    completedAt: '2026-08-15T10:00:00.000Z',
  });

  it('eşiği aşan doluluk düşüşü kapıyı düşürür', () => {
    const worse = run([result({ index: 1, fillPercent: 60 }), result({ index: 2, fillPercent: 60 })]);
    const gate = evaluateGate({ run: worse, previous, criteria: VF });

    expect(ids(gate.violations)).toContain('meanFillDrop');
    expect(gate.comparedTo).toBe('2026-08-15T10:00:00.000Z');
  });

  it('eşiğin altındaki düşüşü gürültü sayar', () => {
    const barelyWorse = run([
      result({ index: 1, fillPercent: 69.8 }),
      result({ index: 2, fillPercent: 69.8 }),
    ]);
    expect(evaluateGate({ run: barelyWorse, previous, criteria: VF }).passed).toBe(true);
  });

  /**
   * İhlal SAYISI değişmese bile başka bir senaryonun bozulması gerilemedir;
   * yalnızca toplama bakan bir kapı bunu kaçırırdı.
   */
  it('yeni bozulan senaryoyu yakalar', () => {
    const before = run(
      [
        result({ index: 1, failedCheckCount: 1, failedCheckIds: ['overlap'] }),
        result({ index: 2 }),
      ],
      { completedAt: '2026-08-15T10:00:00.000Z' },
    );
    const after = run([
      result({ index: 1 }),
      result({ index: 2, failedCheckCount: 1, failedCheckIds: ['support'] }),
    ]);

    const gate = evaluateGate({
      run: after,
      previous: before,
      criteria: VF,
      thresholds: { allowHardFailures: true },
    });
    expect(ids(gate.violations)).toEqual(['newlyFailing']);
  });

  // Farklı tohum/katalog başka senaryolar üretir; kıyas motorun farkını ölçmez.
  it('karşılaştırılamayan referansı yok sayar', () => {
    const otherSeed = run([result({ index: 1, fillPercent: 70 })], {
      seed: 99,
      completedAt: '2026-08-15T10:00:00.000Z',
    });
    const worse = run([result({ index: 1, fillPercent: 10 })]);

    const gate = evaluateGate({ run: worse, previous: otherSeed, criteria: VF });
    expect(gate.comparedTo).toBeNull();
    expect(gate.passed).toBe(true);
  });

  it('iyileşme kapıyı düşürmez', () => {
    const better = run([result({ index: 1, fillPercent: 90 }), result({ index: 2, fillPercent: 90 })]);
    expect(evaluateGate({ run: better, previous, criteria: VF }).passed).toBe(true);
  });
});
