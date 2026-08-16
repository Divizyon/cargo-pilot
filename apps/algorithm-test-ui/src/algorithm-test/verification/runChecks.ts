import {
  checkBounds,
  checkCogMismatch,
  checkConservation,
  checkFragility,
  checkLifoVertical,
  checkLifoZone,
  checkLoadingCorner,
  checkOverlap,
  checkRotation,
  checkStackCount,
  checkStackable,
  checkSupport,
  checkTotalWeight,
  checkWeightOnTop,
} from './checks';
import type { CheckInput, CheckResult } from './types';

/**
 * Denetleyicilerin sabit sırası. Sıra yalnızca sunum içindir — hepsi saf ve
 * birbirinden bağımsızdır: önce korunum, sonra geometrik geçerlilik, sonra
 * istif kuralları, sonra ölçüt karşılaştırmaları.
 *
 * Korunum başta: diğer on iki kural yalnızca DÖNEN yerleşimleri denetler, yani
 * eksik dönen bir kutuyu hiçbiri göremez. Önce "hepsi geldi mi" sorulur.
 */
const CHECKS = [
  checkConservation,
  checkBounds,
  checkOverlap,
  checkSupport,
  checkStackable,
  checkStackCount,
  checkWeightOnTop,
  checkFragility,
  checkRotation,
  checkLifoVertical,
  checkTotalWeight,
  checkCogMismatch,
  checkLifoZone,
  checkLoadingCorner,
] as const;

export function runChecks(input: CheckInput): CheckResult[] {
  return CHECKS.map((check) => check(input));
}

export interface CheckSummary {
  pass: number;
  fail: number;
  skipped: number;
  /** Yumuşak kuralların ihlali; ihlal değil uyarıdır. */
  softFail: number;
}

export function summarizeChecks(results: readonly CheckResult[]): CheckSummary {
  const summary: CheckSummary = { pass: 0, fail: 0, skipped: 0, softFail: 0 };

  for (const result of results) {
    if (result.status === 'fail' && result.severity === 'soft') {
      summary.softFail += 1;
      continue;
    }
    summary[result.status] += 1;
  }

  return summary;
}

/**
 * Sert kuralların ihlaline karışan tüm yerleşim indeksleri. Canvas'ta kırmızıya
 * boyanacak kutular bunlardır — yalnızca çakışanlar değil, sınır dışına taşan
 * veya desteksiz duran kutular da. Yumuşak kurallar dahil edilmez.
 */
export function hardFailureIndices(results: readonly CheckResult[]): Set<number> {
  const indices = new Set<number>();
  for (const result of results) {
    if (result.status !== 'fail' || result.severity !== 'hard') continue;
    for (const index of result.failedPlacementIndices) indices.add(index);
  }
  return indices;
}
