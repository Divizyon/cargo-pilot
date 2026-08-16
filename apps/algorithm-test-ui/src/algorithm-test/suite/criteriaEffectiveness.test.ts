import { describe, expect, it } from 'vitest';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { SUITE_RUN_VERSION, type SuiteRun, type SuiteScenarioResult } from '../utils/suiteStorage';
import {
  MIN_SCENARIOS_FOR_EFFECTIVENESS,
  evaluateCriteriaEffectiveness,
  type EffectivenessId,
} from './criteriaEffectiveness';

/**
 * Kriter etkinliği, toplamların yakalayamadığı bir hatayı yakalar: üç kriterin
 * hepsi çalışıyor görünürken hiçbirinin kendi hedefini gütmemesi. Testler bu
 * yüzden "doluluk düştü mü" değil, "sıralama bozuldu mu" sorusunu kuruyor.
 */

const VF = OptimizationCriteria.VolumeFirst;
const WB = OptimizationCriteria.WeightBalance;
const LIFO = OptimizationCriteria.Lifo;

interface RowShape {
  criteria: OptimizationCriteria;
  fillPercent?: number;
  balance?: number;
  failedCheckIds?: SuiteScenarioResult['failedCheckIds'];
}

function rows(count: number, shape: RowShape): SuiteScenarioResult[] {
  return Array.from({ length: count }, (_, i) => ({
    index: i + 1,
    criteria: shape.criteria,
    fillPercent: shape.fillPercent ?? 50,
    placedCount: 10,
    requestedCount: 10,
    balanceOffsetX: (shape.balance ?? 10) / 2,
    balanceOffsetZ: (shape.balance ?? 10) / 2,
    failedCheckCount: shape.failedCheckIds?.length ?? 0,
    failedCheckIds: shape.failedCheckIds ?? [],
    softFailedCheckCount: 0,
    lifoZoneOverflowCm: null,
    unplacedReasons: [],
    durationMs: 1,
    error: null,
  }));
}

function run(results: SuiteScenarioResult[]): SuiteRun {
  return {
    version: SUITE_RUN_VERSION,
    seed: 1,
    requestedScenarios: results.length,
    completedAt: '2026-08-15T10:00:00.000Z',
    catalogSignature: 'sig',
    generatorVersion: 2,
    engineVersion: null,
    coverage: [],
    results,
    aggregates: [],
  };
}

const SAMPLE = MIN_SCENARIOS_FOR_EFFECTIVENESS;

function verdictOf(results: SuiteScenarioResult[], id: EffectivenessId) {
  return evaluateCriteriaEffectiveness(run(results)).find((entry) => entry.id === id)?.verdict;
}

describe('evaluateCriteriaEffectiveness', () => {
  const healthy = [
    ...rows(SAMPLE, { criteria: VF, fillPercent: 80, balance: 30 }),
    ...rows(SAMPLE, { criteria: WB, fillPercent: 60, balance: 5 }),
    ...rows(SAMPLE, { criteria: LIFO, fillPercent: 55, balance: 25 }),
  ];

  it('kriterler hedeflerini güdüyorsa hepsi geçer', () => {
    const results = evaluateCriteriaEffectiveness(run(healthy));
    expect(results.map((entry) => entry.verdict)).toEqual(['pass', 'pass', 'pass']);
  });

  /**
   * Hacim Önceliği'nin doluluğu bir başkasının altına düşerse kriter adını hak
   * etmiyordur; toplam doluluk yine makul görünebilir.
   */
  it('Hacim Önceliği doluluk sıralamasını kaybederse kalır', () => {
    const broken = [
      ...rows(SAMPLE, { criteria: VF, fillPercent: 50 }),
      ...rows(SAMPLE, { criteria: WB, fillPercent: 70 }),
      ...rows(SAMPLE, { criteria: LIFO, fillPercent: 55 }),
    ];
    expect(verdictOf(broken, 'volumeFirstFill')).toBe('fail');
  });

  it('yuvarlama düzeyindeki farkı ihlal saymaz', () => {
    const tie = [
      ...rows(SAMPLE, { criteria: VF, fillPercent: 69.8 }),
      ...rows(SAMPLE, { criteria: WB, fillPercent: 70 }),
      ...rows(SAMPLE, { criteria: LIFO, fillPercent: 55 }),
    ];
    expect(verdictOf(tie, 'volumeFirstFill')).toBe('pass');
  });

  it('Ağırlık Dengesi sapması rakiplerden yüksekse kalır', () => {
    const broken = [
      ...rows(SAMPLE, { criteria: VF, balance: 5 }),
      ...rows(SAMPLE, { criteria: WB, balance: 40 }),
      ...rows(SAMPLE, { criteria: LIFO, balance: 20 }),
    ];
    expect(verdictOf(broken, 'weightBalanceOffset')).toBe('fail');
  });

  // LIFO dikey kuralı sert kısıt: bir kez bile bozulması ihlaldir.
  it('LIFO dikey kuralı tek senaryoda bozulsa bile kalır', () => {
    const broken = [
      ...rows(SAMPLE, { criteria: VF }),
      ...rows(SAMPLE, { criteria: WB }),
      ...rows(SAMPLE - 1, { criteria: LIFO }),
      ...rows(1, { criteria: LIFO, failedCheckIds: ['lifoVertical'] }),
    ];
    expect(verdictOf(broken, 'lifoVerticalIntegrity')).toBe('fail');
  });

  /**
   * Küçük örneklemde sıralama motorun değil, seçilen yüklerin sonucudur.
   * "Ölçülemedi" demek, uydurma bir yargıdan iyidir.
   */
  it('örneklem yetersizse yargı kurmaz', () => {
    const tiny = [
      ...rows(2, { criteria: VF, fillPercent: 10 }),
      ...rows(2, { criteria: WB, fillPercent: 90 }),
      ...rows(2, { criteria: LIFO }),
    ];
    expect(evaluateCriteriaEffectiveness(run(tiny)).map((entry) => entry.verdict)).toEqual([
      'inconclusive',
      'inconclusive',
      'inconclusive',
    ]);
  });

  it('rakip kriter hiç koşulmadıysa karşılaştırma yapmaz', () => {
    const onlyVolume = rows(SAMPLE, { criteria: VF, fillPercent: 80 });
    expect(verdictOf(onlyVolume, 'volumeFirstFill')).toBe('inconclusive');
  });
});
