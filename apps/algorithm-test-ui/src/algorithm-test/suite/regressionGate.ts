import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import {
  aggregateFor,
  compareSuites,
  isComparable,
  type SuiteComparison,
  type SuiteRun,
} from '../utils/suiteStorage';
import type { EffectivenessResult } from './criteriaEffectiveness';

/**
 * Koşuyu geçti/kaldı kararına çeviren kapı.
 *
 * Rapor okumak insan işi; loop ise otomatik olmak zorunda. Kapı olmadan "ortalama
 * doluluk 0.3 puan düştü" satırını birinin görüp yorumlaması gerekiyordu. Eşikler
 * bunu tek bir çıkış koduna indirger, böylece toplu koşu bir betikten koşulup
 * gerilemede durabilir.
 *
 * İki tür kural var ve ayrımı önemli:
 *   MUTLAK  — geçmişe ihtiyaç duymaz (sert kural ihlali, koşulamayan senaryo,
 *             kriterin işini yapmaması). İlk koşu bile bunlardan kalabilir.
 *   GÖRELİ  — önceki koşuyla karşılaştırma gerektirir (doluluk düşüşü, yeni
 *             bozulan senaryo). Karşılaştırılabilir koşu yoksa uygulanmaz.
 */

export interface GateThresholds {
  /** Ortalama dolulukta kabul edilen azami düşüş (yüzde puanı). */
  meanFillDropPt: number;
  /** En kötü senaryonun dolulugunda kabul edilen azami düşüş. */
  worstFillDropPt: number;
  /** Yerleşen kutu oranında kabul edilen azami düşüş. */
  placedRatioDropPt: number;
  /** Önce temizken şimdi kural bozan senaryo için tolerans. */
  maxNewlyFailingScenarios: number;
  /** Sert kural ihlali içeren koşu geçebilir mi. */
  allowHardFailures: boolean;
  /** Koşulamayan senaryo içeren koşu geçebilir mi. */
  allowErrors: boolean;
  /** Kriter etkinlik iddialarının kalması kapıyı düşürsün mü. */
  requireCriteriaEffectiveness: boolean;
}

export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  meanFillDropPt: 0.5,
  worstFillDropPt: 1,
  placedRatioDropPt: 0.5,
  maxNewlyFailingScenarios: 0,
  allowHardFailures: false,
  allowErrors: false,
  requireCriteriaEffectiveness: true,
};

export type GateViolationId =
  | 'hardFailures'
  | 'errors'
  | 'effectiveness'
  | 'meanFillDrop'
  | 'worstFillDrop'
  | 'placedRatioDrop'
  | 'newlyFailing';

export interface GateViolation {
  id: GateViolationId;
  label: string;
  detail: string;
}

export interface GateResult {
  passed: boolean;
  violations: GateViolation[];
  /** Karşılaştırma yapılan koşunun zamanı; yoksa yalnızca mutlak kurallar işledi. */
  comparedTo: string | null;
  comparison: SuiteComparison | null;
}

export interface GateInput {
  run: SuiteRun;
  previous?: SuiteRun | null;
  criteria: OptimizationCriteria;
  effectiveness?: readonly EffectivenessResult[];
  thresholds?: Partial<GateThresholds>;
}

function drop(value: number | null): number {
  // Negatif delta = düşüş. Null ölçülemedi demek; ihlal saymayız.
  return value !== null && value < 0 ? -value : 0;
}

export function evaluateGate({
  run,
  previous,
  criteria,
  effectiveness = [],
  thresholds,
}: GateInput): GateResult {
  const limits = { ...DEFAULT_GATE_THRESHOLDS, ...thresholds };
  const violations: GateViolation[] = [];
  const aggregate = aggregateFor(run, criteria);

  // ── Mutlak kurallar ────────────────────────────────────────────────────────
  if (!limits.allowHardFailures && aggregate.scenariosWithFailures > 0) {
    const worst = aggregate.failuresByCheck
      .slice(0, 3)
      .map((entry) => `${entry.id}×${entry.scenarios}`)
      .join(', ');
    violations.push({
      id: 'hardFailures',
      label: 'Sert kural ihlali',
      detail: `${aggregate.scenariosWithFailures} senaryoda ihlal var${worst ? ` (${worst})` : ''}`,
    });
  }

  if (!limits.allowErrors && aggregate.errorCount > 0) {
    violations.push({
      id: 'errors',
      label: 'Koşulamayan senaryo',
      detail: `${aggregate.errorCount} senaryo hata verdi`,
    });
  }

  if (limits.requireCriteriaEffectiveness) {
    for (const result of effectiveness.filter((entry) => entry.verdict === 'fail')) {
      violations.push({
        id: 'effectiveness',
        label: result.label,
        detail: `${result.expectation} — ${result.detail}`,
      });
    }
  }

  // ── Göreli kurallar ────────────────────────────────────────────────────────
  const reference = previous && isComparable(previous, run) ? previous : null;
  const comparison = reference ? compareSuites(run, reference, criteria) : null;

  if (comparison) {
    const meanDrop = drop(comparison.meanFill);
    if (meanDrop > limits.meanFillDropPt) {
      violations.push({
        id: 'meanFillDrop',
        label: 'Ortalama doluluk düştü',
        detail: `−${meanDrop.toFixed(2)} puan (eşik ${limits.meanFillDropPt})`,
      });
    }

    const worstDrop = drop(comparison.worstFill);
    if (worstDrop > limits.worstFillDropPt) {
      violations.push({
        id: 'worstFillDrop',
        label: 'En kötü senaryo geriledi',
        detail: `−${worstDrop.toFixed(2)} puan (eşik ${limits.worstFillDropPt})`,
      });
    }

    const placedDrop = drop(comparison.placedRatio);
    if (placedDrop > limits.placedRatioDropPt) {
      violations.push({
        id: 'placedRatioDrop',
        label: 'Yerleşen kutu oranı düştü',
        detail: `−${placedDrop.toFixed(2)} puan (eşik ${limits.placedRatioDropPt})`,
      });
    }

    if (comparison.newlyFailing.length > limits.maxNewlyFailingScenarios) {
      violations.push({
        id: 'newlyFailing',
        label: 'Yeni bozulan senaryo',
        detail: `#${comparison.newlyFailing.join(', #')} önce temizdi`,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    comparedTo: reference?.completedAt ?? null,
    comparison,
  };
}
