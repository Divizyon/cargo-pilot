import { z } from 'zod';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';

/**
 * Formdaki senaryonun kalıcılığı.
 *
 * Oturum bellekte tutulduğu için sayfa yenilenince giriş tekrar gerekir, ama
 * senaryonun da kaybolması gereksizdi. Kaydedilen şey formun GİRDİSİDİR, koşunun
 * sonucu değil; sonuç motordan yeniden alınır. Ürün kısıtları da kaydedilmez —
 * onlar katalogdan gelir.
 */
export const scenarioSchema = z.object({
  version: z.literal(1),
  vehicleId: z.string(),
  // LoadingPlanOptimizationCriteria.cs: Lifo=0, WeightBalance=1, VolumeFirst=2
  optimizationCriteria: z.union([
    z.literal(OptimizationCriteria.Lifo),
    z.literal(OptimizationCriteria.WeightBalance),
    z.literal(OptimizationCriteria.VolumeFirst),
  ]),
  clusterGroups: z.boolean(),
  items: z.array(
    z.object({
      itemId: z.string(),
      quantity: z.number().int().positive(),
      /** 0 = gruba dahil değil. */
      groupNumber: z.number().int().min(0),
    }),
  ),
});

export type Scenario = z.infer<typeof scenarioSchema>;

const STORAGE_KEY = 'cargo-pilot-algorithm-test-scenario';

export function saveScenarioToStorage(scenario: Scenario): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
  } catch {
    // Kota dolu ya da depolama kapalı — senaryo kalıcılığı kritik değil.
  }
}

export function loadScenarioFromStorage(): Scenario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = scenarioSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Toplu koşudaki bir senaryoyu tek senaryo formuna taşır.
 *
 * Rapordan bozuk vakaya dönüş yolu bu. Üretim tohumlu olduğu için senaryo sıra
 * numarasından birebir yeniden kurulabiliyor; elle kurmak hem yavaş hem de
 * sessizce farklı bir yük üretmeye açık.
 */
export function fromSuiteScenario(
  suiteScenario: {
    vehicleId: string;
    clusterGroups: boolean;
    items: ReadonlyArray<{ itemId: string; quantity: number; groupNumber: number }>;
  },
  optimizationCriteria: OptimizationCriteria,
): Scenario {
  return {
    version: 1,
    vehicleId: suiteScenario.vehicleId,
    optimizationCriteria,
    clusterGroups: suiteScenario.clusterGroups,
    items: suiteScenario.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      groupNumber: item.groupNumber,
    })),
  };
}
