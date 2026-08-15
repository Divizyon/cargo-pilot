import { describe, expect, it } from 'vitest';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { SUITE_RUN_VERSION, type SuiteRun, type SuiteScenarioResult } from '../utils/suiteStorage';
import {
  buildMarkdownSummary,
  buildSuiteReport,
  parseSuiteRun,
  serializeReport,
  suiteReportFileName,
} from './suiteReport';

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
    error: null,
    ...overrides,
  };
}

function run(overrides: Partial<SuiteRun> = {}): SuiteRun {
  return {
    version: SUITE_RUN_VERSION,
    seed: 42,
    requestedScenarios: 1,
    completedAt: '2026-08-15T12:30:45.123Z',
    catalogSignature: 'sig',
    generatorVersion: 2,
    engineVersion: null,
    coverage: [],
    results: [result()],
    aggregates: [],
    ...overrides,
  };
}

describe('buildSuiteReport', () => {
  it('koşuyu, etkinliği ve kapıyı tek nesnede toplar', () => {
    const report = buildSuiteReport({
      run: run(),
      criteria: VF,
      generatedAt: '2026-08-15T13:00:00.000Z',
    });

    expect(report.run.seed).toBe(42);
    expect(report.effectiveness).toHaveLength(3);
    expect(report.gate.passed).toBe(true);
    expect(report.criteriaLabel).toBe('Hacim Önceliği');
  });

  it('referans verilirse kapı karşılaştırmayı da taşır', () => {
    const previous = run({ completedAt: '2026-08-15T10:00:00.000Z' });
    const report = buildSuiteReport({
      run: run(),
      previous,
      criteria: VF,
      generatedAt: '2026-08-15T13:00:00.000Z',
    });

    expect(report.gate.comparedTo).toBe('2026-08-15T10:00:00.000Z');
    expect(report.gate.comparison?.meanFill).toBeCloseTo(0);
  });
});

describe('suiteReportFileName', () => {
  // Dosya adında iki nokta Windows'ta geçersiz; sıralanabilirlik de korunmalı.
  it('zaman damgasını dosya adına uygun hâle getirir', () => {
    expect(suiteReportFileName(run())).toBe('suite-seed42-2026-08-15T12-30-45-123Z.json');
  });

  it('motor sürümünü ada katar', () => {
    expect(suiteReportFileName(run({ engineVersion: 'abc 123' }))).toContain('-abc-123-');
  });
});

describe('parseSuiteRun', () => {
  const report = buildSuiteReport({
    run: run(),
    criteria: VF,
    generatedAt: '2026-08-15T13:00:00.000Z',
  });

  it('rapor sarmalayıcısından koşuyu çıkarır', () => {
    expect(parseSuiteRun(serializeReport(report))?.seed).toBe(42);
  });

  // Elle kaydedilmiş çıplak bir koşu da referans olarak verilebilmeli.
  it('çıplak koşu kaydını da kabul eder', () => {
    expect(parseSuiteRun(JSON.stringify(run()))?.seed).toBe(42);
  });

  it('bozuk içerikte null döner, kısmi nesne uydurmaz', () => {
    expect(parseSuiteRun('{ bozuk')).toBeNull();
    expect(parseSuiteRun(JSON.stringify({ run: { seed: 1 } }))).toBeNull();
  });

  /**
   * Şema sürümü atlayan eski bir rapor referans olarak kabul edilirse,
   * karşılaştırma eksik alanlar üzerinden sessizce yanlış sonuç verirdi.
   */
  it('eski şema sürümünü reddeder', () => {
    expect(parseSuiteRun(JSON.stringify({ ...run(), version: 1 }))).toBeNull();
  });
});

describe('buildMarkdownSummary', () => {
  const passing = buildSuiteReport({
    run: run(),
    criteria: VF,
    generatedAt: '2026-08-15T13:00:00.000Z',
  });

  it('geçen koşuyu başlıkta belli eder', () => {
    expect(buildMarkdownSummary(passing)).toContain('geçti');
  });

  it('referans yoksa bunu açıkça söyler', () => {
    expect(buildMarkdownSummary(passing)).toContain('Referans koşu yok');
  });

  /**
   * CI özetinin tek işi bu: kapı düştüyse sebebi JSON indirmeden görünsün.
   */
  it('kapıyı düşüren kuralı özete yazar', () => {
    const failing = buildSuiteReport({
      run: run({ results: [result({ failedCheckCount: 1, failedCheckIds: ['overlap'] })] }),
      criteria: VF,
      generatedAt: '2026-08-15T13:00:00.000Z',
    });

    const summary = buildMarkdownSummary(failing);
    expect(summary).toContain('kaldı');
    expect(summary).toContain('Kapıyı düşürenler');
    expect(summary).toContain('overlap');
  });

  it('üç kriter etkinlik satırını da taşır', () => {
    const summary = buildMarkdownSummary(passing);
    for (const label of ['Hacim Önceliği', 'Ağırlık Dengesi', 'LIFO']) {
      expect(summary).toContain(label);
    }
  });
});
