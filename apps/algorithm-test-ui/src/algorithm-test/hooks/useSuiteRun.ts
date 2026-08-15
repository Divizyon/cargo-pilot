import { useCallback, useRef, useState } from 'react';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { suiteClient } from '../suite/browserClient';
import { runSuite, type SuiteProgress } from '../suite/runSuite';
import { appendSuite, clearSuites, loadSuites, type SuiteRun } from '../utils/suiteStorage';

/**
 * Toplu koşunun React kabuğu.
 *
 * Koşunun kendisi `suite/runSuite.ts`'te ve React bilmiyor; buradaki iş yalnızca
 * ilerlemeyi duruma yazmak, iptali iletmek ve sonucu kalıcı kayda eklemek.
 * Ayrım kasıtlı: komut satırı aracı aynı motoru hook olmadan koşturuyor, iki
 * yolun sonucu birbirinden ayrışamaz.
 */

export interface UseSuiteRunResult {
  suites: SuiteRun[];
  progress: SuiteProgress | null;
  isRunning: boolean;
  error: string | null;
  start: (seed: number, count: number, engineVersion: string | null) => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

interface SuiteInputs {
  vehicles: readonly Vehicle[];
  items: readonly Item[];
}

export function useSuiteRun({ vehicles, items }: SuiteInputs): UseSuiteRunResult {
  const [suites, setSuites] = useState<SuiteRun[]>(loadSuites);
  const [progress, setProgress] = useState<SuiteProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  const start = useCallback(
    async (seed: number, count: number, engineVersion: string | null) => {
      cancelledRef.current = false;
      setIsRunning(true);
      setError(null);

      try {
        const outcome = await runSuite({
          seed,
          count,
          vehicles,
          items,
          client: suiteClient,
          engineVersion,
          onProgress: setProgress,
          shouldCancel: () => cancelledRef.current,
        });

        if (outcome.status === 'ok') {
          setSuites((prev) => appendSuite(outcome.run, prev));
          return;
        }
        if (outcome.status === 'empty-catalog') {
          setError('Senaryo üretilemedi — katalogda araç ya da ürün yok.');
          return;
        }
        if (outcome.status === 'no-results') {
          setError('Hiçbir senaryo tamamlanamadı — sunucuya erişilemiyor olabilir.');
          return;
        }
        // Yarıda kesilen koşu kaydedilmez: eksik örneklem tam bir koşuyla
        // karşılaştırılırsa fark motorun değil, senaryo sayısının farkı olur.
        setError('Koşu durduruldu — kısmi sonuç kaydedilmedi.');
      } finally {
        setIsRunning(false);
        setProgress(null);
      }
    },
    [items, vehicles],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const clear = useCallback(() => {
    clearSuites();
    setSuites([]);
  }, []);

  return { suites, progress, isRunning, error, start, cancel, clear };
}
