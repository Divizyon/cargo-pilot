import { OptimizationCriteria } from '@/lib/types/loadingPlan';

/**
 * Kriter sırası ve etiketleri.
 *
 * React'ten bağımsız bir modülde duruyorlar: toplu koşu motoru (suite/runSuite.ts)
 * ve komut satırı aracı hook import edemez, ama aynı kriter listesini kullanmak
 * zorunda — liste iki yerde ayrı tutulursa rapor ile arayüz sessizce ayrışır.
 */
export const CRITERIA_ORDER = [
  OptimizationCriteria.VolumeFirst,
  OptimizationCriteria.WeightBalance,
  OptimizationCriteria.Lifo,
] as const;

export const CRITERIA_LABEL: Record<OptimizationCriteria, string> = {
  [OptimizationCriteria.VolumeFirst]: 'Hacim Önceliği',
  [OptimizationCriteria.WeightBalance]: 'Ağırlık Dengesi',
  [OptimizationCriteria.Lifo]: 'LIFO',
};

export function isOptimizationCriteria(value: number): value is OptimizationCriteria {
  return (CRITERIA_ORDER as readonly number[]).includes(value);
}
