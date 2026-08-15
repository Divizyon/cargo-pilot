import { useCallback, useState } from 'react';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { CRITERIA_LABEL, CRITERIA_ORDER } from '../criteria';
import type { AlgorithmTestRequest } from '../schemas/algorithmTestRequestSchema';
import type { RunContext } from '../verification/types';
import type { AlgorithmRun } from './useAlgorithmTestRun';

export { CRITERIA_LABEL, CRITERIA_ORDER };

export interface UseCriteriaMatrixRunResult {
  runs: AlgorithmRun[];
  selectedRun: AlgorithmRun | null;
  selectedCriteria: OptimizationCriteria | null;
  selectCriteria: (criteria: OptimizationCriteria) => void;
  runMatrix: (request: AlgorithmTestRequest, context: RunContext) => Promise<void>;
  runSingle: (request: AlgorithmTestRequest, context: RunContext) => Promise<void>;
  /** Şu an süren kriterler; matris paralel koştuğu için birden fazla olabilir. */
  pendingCriteria: readonly OptimizationCriteria[];
  reset: () => void;
}

/**
 * Motor deterministik (DeterminizmTests.cs bunu pinler), bu yüzden aynı senaryoyu
 * tekrar koşturmak yeni bilgi üretmez. Bunun yerine aynı ürün setini üç kriterden
 * geçirip sonuçları yan yana koyuyoruz — tek senaryoyu bir turda kapsayan ölçüm bu.
 *
 * Sürümler arası gidişat burada tutulmaz; o toplu koşunun işi (suite/). Tek
 * senaryo tarafında ayrıca ölçüm serisi tutmak aynı soruyu ikinci kez, daha
 * zayıf biçimde cevaplıyordu.
 */
export function useCriteriaMatrixRun(
  run: (request: AlgorithmTestRequest, context: RunContext) => Promise<AlgorithmRun | null>,
): UseCriteriaMatrixRunResult {
  const [runs, setRuns] = useState<AlgorithmRun[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<OptimizationCriteria | null>(null);
  const [pendingCriteria, setPendingCriteria] = useState<readonly OptimizationCriteria[]>([]);

  const runMatrix = useCallback(
    async (request: AlgorithmTestRequest, context: RunContext) => {
      setRuns([]);
      setSelectedCriteria(null);
      setPendingCriteria(CRITERIA_ORDER);

      // Kriterler paralel koşar: her koşu kendi plan kaydını oluşturur, bu yüzden
      // birbirlerini ezmezler. Biten kriter hemen tabloya basılır.
      await Promise.all(
        CRITERIA_ORDER.map(async (criteria) => {
          const result = await run({ ...request, optimizationCriteria: criteria }, context);
          if (result) {
            setRuns((prev) => [...prev, result]);
            setSelectedCriteria((prev) => prev ?? criteria);
          }
          setPendingCriteria((prev) => prev.filter((c) => c !== criteria));
        }),
      );

      setPendingCriteria([]);
    },
    [run],
  );

  const runSingle = useCallback(
    async (request: AlgorithmTestRequest, context: RunContext) => {
      setPendingCriteria([request.optimizationCriteria]);
      const result = await run(request, context);
      setPendingCriteria([]);
      if (!result) return;

      setRuns((prev) => [...prev.filter((r) => r.criteria !== result.criteria), result]);
      setSelectedCriteria(result.criteria);
    },
    [run],
  );

  const reset = useCallback(() => {
    setRuns([]);
    setSelectedCriteria(null);
  }, []);

  return {
    runs: CRITERIA_ORDER.map((c) => runs.find((r) => r.criteria === c)).filter(
      (r): r is AlgorithmRun => r !== undefined,
    ),
    selectedRun: runs.find((r) => r.criteria === selectedCriteria) ?? null,
    selectedCriteria,
    selectCriteria: setSelectedCriteria,
    runMatrix,
    runSingle,
    pendingCriteria,
    reset,
  };
}
