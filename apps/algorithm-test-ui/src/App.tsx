import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AppShell, PageHeader, SectionCard, type ViewId } from '@/components/shared/AppShell';
import { useItems } from '@/lib/api/useItems';
import { useVehicles } from '@/lib/api/useVehicles';
import type { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { AlgorithmTestForm } from './algorithm-test/components/AlgorithmTestForm';
import { ConstraintChecksPanel } from './algorithm-test/components/ConstraintChecksPanel';
import { CriteriaMatrixPanel } from './algorithm-test/components/CriteriaMatrixPanel';
import { PlacementViewer } from './algorithm-test/components/PlacementViewer';
import { RunSummary } from './algorithm-test/components/RunSummary';
import { SuitePanel } from './algorithm-test/components/SuitePanel';
import { useAlgorithmTestRun } from './algorithm-test/hooks/useAlgorithmTestRun';
import { useCriteriaMatrixRun } from './algorithm-test/hooks/useCriteriaMatrixRun';
import { useSuiteRun } from './algorithm-test/hooks/useSuiteRun';
import { fromSuiteScenario, type Scenario } from './algorithm-test/utils/scenarioIo';
import { generateSuite } from './algorithm-test/utils/suiteGenerator';
import { catalogSignature, type SuiteRun } from './algorithm-test/utils/suiteStorage';
import { summarizeChecks } from './algorithm-test/verification/runChecks';
import type { CheckId } from './algorithm-test/verification/types';

export function AlgorithmTestPage() {
  const { run, isRunning, error, clearError } = useAlgorithmTestRun();
  const {
    runs,
    selectedRun,
    selectedCriteria,
    selectCriteria,
    runMatrix,
    runSingle,
    pendingCriteria,
    reset,
  } = useCriteriaMatrixRun(run);

  const [view, setView] = useState<ViewId>('suite');
  const [selectedCheckId, setSelectedCheckId] = useState<CheckId | null>(null);
  const [incomingScenario, setIncomingScenario] = useState<Scenario | null>(null);

  // Katalog hem formda hem toplu koşuda kullanılır; TanStack Query önbelleği paylaşır.
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const { data: vehiclesPage } = useVehicles({ pageSize: 100 });
  const vehicles = vehiclesPage?.items ?? [];
  const items = itemsPage?.items ?? [];

  const suite = useSuiteRun({ vehicles, items });

  const isBusy = isRunning || pendingCriteria.length > 0;
  const isCatalogReady = vehicles.length > 0 && items.length > 0;

  const currentCatalogSignature = useMemo(
    () => catalogSignature(vehicles, items),
    [items, vehicles],
  );

  // Toplu koşudan tek senaryo formuna aktarım. Senaryo saklanmaz; tohum ve sıra
  // numarasından yeniden üretilir — üretim saf ve tohumlu olduğu için sonuç
  // koşudakiyle birebir aynıdır.
  const inspectScenario = useCallback(
    (suiteRun: SuiteRun, index: number, criteria: OptimizationCriteria) => {
      const scenario = generateSuite(
        suiteRun.seed,
        suiteRun.requestedScenarios,
        vehicles,
        items,
      ).find((candidate) => candidate.index === index);

      if (!scenario) return;

      setIncomingScenario(fromSuiteScenario(scenario, criteria));
      setView('single');
    },
    [items, vehicles],
  );

  // Koşu değişince kural seçimi düşer; indeksler yeni yerleşim listesine ait değil.
  useEffect(() => {
    setSelectedCheckId(null);
  }, [selectedRun]);

  const highlightedIndices = useMemo(() => {
    if (!selectedRun || selectedCheckId === null) return null;
    return selectedRun.checks.find((c) => c.id === selectedCheckId)?.failedPlacementIndices ?? null;
  }, [selectedCheckId, selectedRun]);

  const checkSummary = selectedRun ? summarizeChecks(selectedRun.checks) : null;

  return (
    <AppShell
      view={view}
      onViewChange={setView}
      badge={{
        suite: suite.isRunning ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="çalışıyor" />
        ) : undefined,
      }}
    >
      {view === 'single' && (
        // Geniş ekranda sayfa ekran yüksekliğine oturur: kaydırma sayfada değil,
        // iki kolonun kendi içinde olur ve alt kenarları çerçeveyle hizalanır.
        // Dar ekranda kolonlar alt alta gelir, orada sayfa kaydırması doğrusu.
        <div className="flex flex-col gap-6 xl:h-full xl:min-h-0">
          <PageHeader
            title="Senaryo İnceleme"
            description="Toplu koşuda düşen bir senaryonun teşhisi: hangi kutu hangi kuralı kırdı. Aynı yük üç kriterden birden geçer ve motorun sert kısıtları sonuç üzerinde istemcide yeniden denetlenir — üretim uygulaması bunların ikisini de göstermez."
            action={
              runs.length > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={reset} disabled={isBusy}>
                  Sonuçları temizle
                </Button>
              ) : undefined
            }
          />

          {/* Sol kolon senaryoyu kurar ve kuralları denetler, sağ kolon yerleşimi
              gösterir. Sayfa kaymıyor: yalnızca formun liste bandı kayar, çizim
              kalan yüksekliği doldurur, kural denetimi ve kriterler hep görünür. */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 xl:flex-row">
            {/* Form kendi boyunda durur (`shrink-0`): kural denetimi koşudan
                sonra dolunca formu ezmesin. Taşma olursa kolonun tamamı kayar. */}
            <aside className="flex w-full shrink-0 flex-col gap-4 xl:w-[380px] xl:min-h-0 xl:overflow-y-auto">
              <div className="shrink-0 rounded-lg border border-border bg-card p-4">
                <AlgorithmTestForm
                  isBusy={isBusy}
                  onRunSingle={runSingle}
                  onRunMatrix={runMatrix}
                  incomingScenario={incomingScenario}
                />
              </div>

              <SectionCard
                title="Kural denetimi"
                meta={
                  checkSummary && (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {checkSummary.fail > 0 && (
                        <span className="text-destructive">{checkSummary.fail} ihlal · </span>
                      )}
                      {checkSummary.pass} geçti · {checkSummary.skipped} atlandı
                    </span>
                  )
                }
              >
                <ConstraintChecksPanel
                  checks={selectedRun?.checks ?? []}
                  selectedId={selectedCheckId}
                  onSelect={setSelectedCheckId}
                />
              </SectionCard>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col gap-4">
              <RunSummary run={selectedRun} error={error} onDismissError={clearError} />

              <PlacementViewer
                placements={selectedRun?.placements ?? []}
                vehicle={selectedRun?.vehicle ?? null}
                itemNameById={selectedRun?.itemNamesById}
                cog={selectedRun?.cog ?? null}
                zones={selectedRun?.zones ?? []}
                highlightedIndices={highlightedIndices}
              />

              <CriteriaMatrixPanel
                runs={runs}
                selectedCriteria={selectedCriteria}
                pendingCriteria={pendingCriteria}
                onSelect={selectCriteria}
              />
            </main>
          </div>
        </div>
      )}

      {view === 'suite' && (
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Toplu Koşu"
            description="Tohumla üretilmiş senaryo setini motorun her sürümüne karşı koşup toplamı karşılaştırın. Tek senaryo bir değişikliğin yönünü söyleyemez; bir yükü iyileştiren değişiklik başkasını bozabilir."
          />
          <SuitePanel
            suite={suite}
            items={items}
            isCatalogReady={isCatalogReady}
            currentCatalogSignature={currentCatalogSignature}
            onInspectScenario={inspectScenario}
          />
        </div>
      )}

    </AppShell>
  );
}
