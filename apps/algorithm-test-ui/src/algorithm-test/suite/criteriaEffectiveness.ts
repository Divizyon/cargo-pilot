import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { CRITERIA_LABEL } from '../criteria';
import { aggregateFor, type SuiteAggregate, type SuiteRun } from '../utils/suiteStorage';

/**
 * "Optimizasyon doğru çalışıyor mu" sorusunun ölçülebilir hâli.
 *
 * Doluluk, denge ve süre toplamak motorun BOZULMADIĞINI gösterir; kriterin
 * kendi işini yaptığını göstermez. Üç kriter aynı sonucu üretse toplamlar yine
 * makul görünürdü. Bu yüzden her kriterin hedefi bir iddiaya çevrilir ve toplu
 * koşu o iddiayı sınar:
 *
 *   Hacim Önceliği  → doluluğu en yüksek olan o olmalı
 *   Ağırlık Dengesi → denge sapması en düşük olan o olmalı
 *   LIFO            → dikey boşaltma kuralı hiç bozulmamalı (sert kısıt)
 *
 * İlk ikisi kriterler arası KARŞILAŞTIRMA; motor sürümünden bağımsız olarak tek
 * bir koşuda bile sınanabilirler. Üçüncüsü mutlak: LIFO dikey kuralı motorun
 * yalnızca Lifo kriterinde uyguladığı sert bir kısıt, bir kez bile bozulmamalı.
 */

export type EffectivenessVerdict = 'pass' | 'fail' | 'inconclusive';

export type EffectivenessId =
  | 'volumeFirstFill'
  | 'weightBalanceOffset'
  | 'lifoVerticalIntegrity';

export interface EffectivenessResult {
  id: EffectivenessId;
  label: string;
  /** İddianın sözle ifadesi; rapor okunurken "ne bekleniyordu" görünsün. */
  expectation: string;
  verdict: EffectivenessVerdict;
  detail: string;
}

/**
 * Bu sayının altındaki örneklemde iddia kurulmaz. Üç senaryoluk bir koşuda
 * kriterler arası sıralama motorun değil, seçilen yüklerin sonucudur.
 */
export const MIN_SCENARIOS_FOR_EFFECTIVENESS = 5;

/**
 * Kriterler arası farkın anlamlı sayılacağı alt sınır (yüzde puanı). Sıfır eşik,
 * beraberlikleri ve yuvarlama gürültüsünü ihlal sayardı.
 */
const TOLERANCE_PT = 0.5;

interface Rival {
  criteria: OptimizationCriteria;
  value: number;
}

/** Örneklemi yeterli ve değeri bilinen kriterler. */
function rivalsOf(
  run: SuiteRun,
  exclude: OptimizationCriteria,
  read: (aggregate: SuiteAggregate) => number | null,
): Rival[] {
  return [OptimizationCriteria.VolumeFirst, OptimizationCriteria.WeightBalance, OptimizationCriteria.Lifo]
    .filter((criteria) => criteria !== exclude)
    .map((criteria) => ({ criteria, aggregate: aggregateFor(run, criteria) }))
    .filter(({ aggregate }) => aggregate.scenarioCount >= MIN_SCENARIOS_FOR_EFFECTIVENESS)
    .map(({ criteria, aggregate }) => ({ criteria, value: read(aggregate) }))
    .filter((rival): rival is Rival => rival.value !== null);
}

function inconclusive(
  id: EffectivenessId,
  label: string,
  expectation: string,
  detail: string,
): EffectivenessResult {
  return { id, label, expectation, verdict: 'inconclusive', detail };
}

function checkVolumeFirstFill(run: SuiteRun): EffectivenessResult {
  const id = 'volumeFirstFill';
  const label = 'Hacim Önceliği doluluğu';
  const expectation = 'Ortalama doluluk diğer iki kriterden düşük olmamalı';

  const own = aggregateFor(run, OptimizationCriteria.VolumeFirst);
  if (own.scenarioCount < MIN_SCENARIOS_FOR_EFFECTIVENESS || own.meanFill === null) {
    return inconclusive(id, label, expectation, `Yeterli ölçüm yok (${own.scenarioCount} senaryo)`);
  }

  const rivals = rivalsOf(run, OptimizationCriteria.VolumeFirst, (a) => a.meanFill);
  if (rivals.length === 0) {
    return inconclusive(id, label, expectation, 'Karşılaştırılacak kriter ölçümü yok');
  }

  const best = rivals.reduce((max, rival) => (rival.value > max.value ? rival : max));
  const passed = own.meanFill >= best.value - TOLERANCE_PT;

  return {
    id,
    label,
    expectation,
    verdict: passed ? 'pass' : 'fail',
    detail:
      `%${own.meanFill.toFixed(1)} — en yakın rakip ${CRITERIA_LABEL[best.criteria]} ` +
      `%${best.value.toFixed(1)}`,
  };
}

function checkWeightBalanceOffset(run: SuiteRun): EffectivenessResult {
  const id = 'weightBalanceOffset';
  const label = 'Ağırlık Dengesi sapması';
  const expectation = 'Ortalama denge sapması diğer iki kriterden yüksek olmamalı';

  const own = aggregateFor(run, OptimizationCriteria.WeightBalance);
  if (own.scenarioCount < MIN_SCENARIOS_FOR_EFFECTIVENESS || own.meanBalance === null) {
    return inconclusive(id, label, expectation, `Yeterli ölçüm yok (${own.scenarioCount} senaryo)`);
  }

  const rivals = rivalsOf(run, OptimizationCriteria.WeightBalance, (a) => a.meanBalance);
  if (rivals.length === 0) {
    return inconclusive(id, label, expectation, 'Karşılaştırılacak kriter ölçümü yok');
  }

  // Sapmada DÜŞÜK olan iyi; en zorlu rakip en düşük sapmalı olandır.
  const best = rivals.reduce((min, rival) => (rival.value < min.value ? rival : min));
  const passed = own.meanBalance <= best.value + TOLERANCE_PT;

  return {
    id,
    label,
    expectation,
    verdict: passed ? 'pass' : 'fail',
    detail:
      `${own.meanBalance.toFixed(1)} puan — en yakın rakip ${CRITERIA_LABEL[best.criteria]} ` +
      `${best.value.toFixed(1)} puan`,
  };
}

function checkLifoVerticalIntegrity(run: SuiteRun): EffectivenessResult {
  const id = 'lifoVerticalIntegrity';
  const label = 'LIFO dikey bütünlüğü';
  const expectation = 'Lifo koşularında dikey boşaltma kuralı hiç bozulmamalı';

  const own = aggregateFor(run, OptimizationCriteria.Lifo);
  if (own.scenarioCount < MIN_SCENARIOS_FOR_EFFECTIVENESS) {
    return inconclusive(id, label, expectation, `Yeterli ölçüm yok (${own.scenarioCount} senaryo)`);
  }

  const violations = own.failuresByCheck.find((entry) => entry.id === 'lifoVertical')?.scenarios ?? 0;

  // Bölge taşması sert kısıt değil; ihlal saymadan kalite göstergesi olarak eklenir.
  const overflow =
    own.meanLifoZoneOverflowCm !== null
      ? ` · ortalama bölge taşması ${own.meanLifoZoneOverflowCm.toFixed(0)} cm`
      : '';

  return {
    id,
    label,
    expectation,
    verdict: violations > 0 ? 'fail' : 'pass',
    detail:
      violations > 0
        ? `${violations} senaryoda dikey kural bozuldu${overflow}`
        : `${own.scenarioCount} senaryonun hiçbirinde bozulmadı${overflow}`,
  };
}

export function evaluateCriteriaEffectiveness(run: SuiteRun): EffectivenessResult[] {
  return [
    checkVolumeFirstFill(run),
    checkWeightBalanceOffset(run),
    checkLifoVerticalIntegrity(run),
  ];
}
