import { useCallback, useRef, useState } from 'react';
import { fromApiPlanDetail, planDetailResponseSchema } from '@/lib/api/loadingPlanMappers';
import { calcVolume } from '@/lib/utils/geometry/geometry';
import type { OptimizationCriteria, Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import type { AlgorithmTestRequest } from '../schemas/algorithmTestRequestSchema';
import { suiteClient } from '../suite/browserClient';
import { describeRequestError } from '../suite/suiteClient';
import { assignProductColors } from '../utils/colors';
import { emptyReasonTotals, toUnplacedReason, type UnplacedReasonTotals } from '../utils/unplacedReason';
import { computeGroupZones, type LifoZone } from '../verification/lifoZones';
import { hardFailureIndices, runChecks } from '../verification/runChecks';
import type { CheckResult, RunContext } from '../verification/types';
import type { CogPoint } from '../components/PlacementCanvas2D';

export interface AlgorithmRun {
  planId: string;
  criteria: OptimizationCriteria;
  durationMs: number;
  vehicle: Vehicle | null;
  placements: Placement[];
  /** Seçilen kutunun adını yazabilmek için; çizimde ürünü renk tonu ayırır. */
  itemNamesById: Map<string, string>;

  placedCount: number;
  requestedCount: number;
  unplacedCount: number;
  unplacedByReason: UnplacedReasonTotals;
  violationCount: number;

  /** Backend `PlanDetailDto.FillRate` (0–1 kesir) yüzdeye çevrilmiş hali. */
  fillPercent: number | null;
  /** Yerleşimlerden istemcide hesaplanan doluluk — backend değeriyle çapraz kontrol için. */
  clientFillPercent: number;
  balanceOffsetX: number | null;
  balanceOffsetZ: number | null;
  totalWeight: number | null;
  /** Backend'in bildirdiği ağırlık merkezi (cm); üç bileşen de gelmezse null. */
  cog: CogPoint | null;
  /** Bu koşuda motorun uyguladığı LIFO bölgeleri; koşul sağlanmazsa boş. */
  zones: LifoZone[];
  /** Motorun sert kısıtlarına karşı istemci denetimi. */
  checks: CheckResult[];
}

/**
 * Backend ile istemci doluluk hesabı bu yüzde puanı farkını aşarsa metriklerden
 * biri şüphelidir: kutu sayısı, ürün ölçüleri ya da araç iç hacmi iki tarafta
 * ayrışıyordur.
 *
 * Rotasyon hatasını YAKALAMAZ — hacim permütasyona duyarsız. Yanlış permütasyonu
 * yakalayan kurallar `bounds` ve `overlap` (checks.ts).
 */
const FILL_MISMATCH_THRESHOLD_PT = 0.5;

export function hasFillMismatch(run: AlgorithmRun): boolean {
  if (run.fillPercent === null) return false;
  return Math.abs(run.fillPercent - run.clientFillPercent) > FILL_MISMATCH_THRESHOLD_PT;
}

export interface UseAlgorithmTestRunResult {
  run: (request: AlgorithmTestRequest, context: RunContext) => Promise<AlgorithmRun | null>;
  isRunning: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Tek bir optimizasyon koşusu yürütür. Her koşu kendi plan kaydını oluşturur;
 * böylece koşular birbirini ezmez ve üç kriter paralel koşabilir.
 *
 * Sunucuyla konuşma toplu koşuyla aynı istemci üzerinden gider (`suite/`), tek
 * fark planın silinmemesi: incelenen yerleşim ekranda kalmalı.
 */
export function useAlgorithmTestRun(): UseAlgorithmTestRunResult {
  // Eşzamanlı koşular sayaçla izlenir: boolean olsaydı ilk biten, hâlâ süren
  // diğerlerini de "bitti" gösterirdi.
  const inFlightRef = useRef(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (request: AlgorithmTestRequest, context: RunContext): Promise<AlgorithmRun | null> => {
      inFlightRef.current += 1;
      setIsRunning(true);
      setError(null);
      const start = performance.now();

      try {
        const planId = await suiteClient.createPlan({
          planName: `Algoritma Testi K${request.optimizationCriteria}`,
          ...request,
        });
        if (!planId) throw new Error('Plan kimliği dönmedi');

        const parsed = planDetailResponseSchema.safeParse(await suiteClient.getPlanDetail(planId));
        if (!parsed.success) throw new Error('Plan sonucu ayrıştırılamadı');

        const detail = fromApiPlanDetail(parsed.data.data);
        const durationMs = performance.now() - start;

        const { centerOfGravityX, centerOfGravityY, centerOfGravityZ } = detail.metrics;
        const cog =
          centerOfGravityX !== null && centerOfGravityY !== null && centerOfGravityZ !== null
            ? { x: centerOfGravityX, y: centerOfGravityY, z: centerOfGravityZ }
            : null;

        const zones = detail.vehicle
          ? computeGroupZones(
              (request.groups ?? []).map((g) => g.unloadingOrder),
              detail.vehicle.length,
              detail.vehicle.doorDirection,
              request.optimizationCriteria,
            )
          : [];

        const unplacedCount = detail.unplacedItems.reduce((sum, u) => sum + u.quantity, 0);
        const unplacedByReason = detail.unplacedItems.reduce((acc, u) => {
          acc[toUnplacedReason(u.reason)] += u.quantity;
          return acc;
        }, emptyReasonTotals());
        const requestedCount = request.items.reduce((sum, item) => sum + item.quantity, 0);

        // Backend WarningDto'yu hiç doldurmuyor, dolayısıyla kural denetimi
        // tümüyle burada yapılır.
        const checks = runChecks({
          placements: detail.placements,
          vehicle: detail.vehicle,
          criteria: request.optimizationCriteria,
          zones,
          backendCog: cog,
          backendBalanceOffsetX: detail.metrics.weightBalanceOffsetX,
          backendBalanceOffsetZ: detail.metrics.weightBalanceOffsetZ,
          requestedCount,
          unplacedCount,
          backendPlacedQuantity: detail.metrics.placedQuantity,
          ...context,
        });

        // Yalnızca çakışma değil, sert kuralların hepsinin ihlali kutuyu işaretler.
        const violating = hardFailureIndices(checks);

        // Renk sırası senaryodan gelir, yerleşimden değil: yerleşim sırası kritere
        // göre değiştiği için matriste satır değiştirince aynı ürün renk atlıyordu.
        const colorByItemId = assignProductColors([
          ...request.items.map((i) => i.itemId),
          ...detail.placements.map((p) => p.itemId),
        ]);

        const placements = detail.placements.map((p, index) => ({
          ...p,
          isViolation: violating.has(index),
          color: colorByItemId[p.itemId],
        }));

        const vehicleVolume = detail.vehicle
          ? calcVolume(detail.vehicle.length, detail.vehicle.width, detail.vehicle.height)
          : 0;
        const toVolumePercent = (volumeCm3: number) =>
          vehicleVolume > 0 ? (volumeCm3 / vehicleVolume) * 100 : 0;

        const usedVolume = placements.reduce(
          (sum, p) => sum + calcVolume(p.depth, p.width, p.height),
          0,
        );

        return {
          planId,
          criteria: request.optimizationCriteria,
          durationMs,
          vehicle: detail.vehicle,
          placements,
          itemNamesById: detail.itemNamesById,
          placedCount: detail.metrics.placedQuantity ?? placements.length,
          requestedCount,
          unplacedCount,
          unplacedByReason,
          violationCount: violating.size,
          fillPercent: detail.metrics.fillRate !== null ? detail.metrics.fillRate * 100 : null,
          clientFillPercent: toVolumePercent(usedVolume),
          balanceOffsetX: detail.metrics.weightBalanceOffsetX,
          balanceOffsetZ: detail.metrics.weightBalanceOffsetZ,
          totalWeight: detail.metrics.totalWeight,
          cog,
          zones,
          checks,
        };
      } catch (err) {
        setError(describeRequestError(err));
        return null;
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setIsRunning(false);
      }
    },
    [],
  );

  return { run, isRunning, error, clearError: useCallback(() => setError(null), []) };
}
