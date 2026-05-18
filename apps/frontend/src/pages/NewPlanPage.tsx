import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { ReadOnlyContext } from '@/features/planning/ReadOnlyContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useLoadingPlanDetail,
  useCreateLoadingPlan,
  useReoptimizeLoadingPlan,
  useUploadPlanThumbnail,
  useRenameLoadingPlan,
} from '@/lib/api/useLoadingPlans';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { planningDetailRoute } from '@/lib/config/routes';
import type { Vehicle } from '@/lib/types/vehicle';

// ─── PlanAutoLoader ───────────────────────────────────────────────────────────

interface PlanAutoLoaderProps {
  planId: string;
  refetchKey?: number;
  onVehicleSelected: () => void;
  onLoaded?: () => void;
}

function PlanAutoLoader({
  planId,
  refetchKey = 0,
  onVehicleSelected,
  onLoaded,
}: PlanAutoLoaderProps) {
  const { data, isSuccess } = useLoadingPlanDetail(planId);

  const setVehicle = usePlanStore((s) => s.setVehicle);
  const addVehicle = usePlanStore((s) => s.addVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const setUnplacedItems = usePlanStore((s) => s.setUnplacedItems);

  // Tracks the last data object that was applied — identity check prevents double-apply.
  const appliedDataRef = useRef<typeof data | null>(null);

  // planId change → full reset (navigating to a different plan)
  useEffect(() => {
    appliedDataRef.current = null;
    usePlanStore.getState().reset();
  }, [planId]);

  // refetchKey change (re-optimization) → allow re-apply without resetting vehicle/items
  useEffect(() => {
    if (refetchKey === 0) return;
    appliedDataRef.current = null;
  }, [refetchKey]);

  useEffect(() => {
    if (!isSuccess || !data) return;
    if (!data.vehicle) return;
    if (appliedDataRef.current === data) return;

    appliedDataRef.current = data;

    // Multi-vehicle: set primary first, then add remaining vehicles in order
    if (data.vehicles && data.vehicles.length > 1) {
      setVehicle(data.vehicles[0]);
      for (let i = 1; i < data.vehicles.length; i++) {
        addVehicle(data.vehicles[i]);
      }
    } else {
      setVehicle(data.vehicle);
    }
    onVehicleSelected();
    const existingColorMap = usePlanStore.getState().skuColorMap;
    const colorMap =
      Object.keys(data.skuColorMap).length > 0
        ? { ...existingColorMap, ...data.skuColorMap }
        : existingColorMap;
    initItems(data.inputItems, colorMap);
    setPlacements(data.placements);
    setUnplacedItems(data.unplacedItems);
    usePlanStore.getState().setInlineGroups(data.groups);

    const contaminated = data.unplacedItems.filter((u) => u.reason === 4);
    if (contaminated.length > 0) {
      toast.warning(
        `${contaminated.length} ürün uyumsuz yük grubu nedeniyle yüklenemedi ve sığmayan ürünler listesine eklendi.`,
        { duration: 6000 },
      );
    }

    onLoaded?.();
  }, [
    isSuccess,
    data,
    setVehicle,
    initItems,
    addVehicle,
    setPlacements,
    setUnplacedItems,
    onVehicleSelected,
    onLoaded,
  ]);

  return null;
}

interface NewPlanPageProps {
  readOnly?: boolean;
}

export function NewPlanPage({ readOnly = false }: NewPlanPageProps) {
  const snapshotRef = useRef<(() => string) | null>(null);
  const snapshotTakenRef = useRef(false);
  const planNameInputRef = useRef<HTMLInputElement>(null);
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 1024);
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 1024);

  const [refetchKey, setRefetchKey] = useState(0);
  const [planNameInput, setPlanNameInput] = useState('');
  const { id: fromPlanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();
  const { mutateAsync: reoptimizePlan, isPending: isReoptimizing } = useReoptimizeLoadingPlan();
  const { mutate: renamePlan } = useRenameLoadingPlan();
  const { mutate: uploadThumbnail } = useUploadPlanThumbnail();
  const uploadThumbnailRef = useRef(uploadThumbnail);
  useEffect(() => {
    uploadThumbnailRef.current = uploadThumbnail;
  }, [uploadThumbnail]);

  useEffect(() => {
    if (!readOnly && !fromPlanId) {
      usePlanStore.getState().reset();
    }
    // fromPlanId is from URL params and stable per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    snapshotTakenRef.current = false;
  }, [refetchKey]);

  const { data: planDetail } = useLoadingPlanDetail(fromPlanId ?? '');

  const handleLoaded = useCallback(() => {
    if (!fromPlanId) return;
    if (snapshotTakenRef.current) return;
    snapshotTakenRef.current = true;
    window.setTimeout(() => {
      const dataUrl =
        snapshotRef.current?.() ??
        (document.querySelector('canvas') as HTMLCanvasElement | null)?.toDataURL(
          'image/jpeg',
          0.7,
        );
      if (dataUrl) {
        uploadThumbnailRef.current({ id: fromPlanId, dataUrl });
      }
    }, 2500);
  }, [fromPlanId]);

  useEffect(() => {
    if (fromPlanId && planDetail?.planName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlanNameInput(planDetail.planName);
    }
  }, [fromPlanId, planDetail?.planName]);

  const handlePlanNameCommit = useCallback(() => {
    if (!fromPlanId || !planNameInput.trim()) return;
    if (planNameInput.trim() === planDetail?.planName) return;
    renamePlan({ id: fromPlanId, planName: planNameInput.trim() });
  }, [fromPlanId, planNameInput, planDetail?.planName, renamePlan]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) {
        setLeftOpen(false);
        setRightOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setAnimationReady = useSceneStore((s) => s.setAnimationReady);

  const handleVehicleSelected = useCallback(() => {}, []);

  const handleConfirmCreate = useCallback(async () => {
    const {
      selectedVehicles,
      selectedItems: items,
      placements,
      unfitItems,
      criteria,
      clusterGroups,
      allowContamination,
      inlineGroups,
    } = usePlanStore.getState();
    if (selectedVehicles.length === 0 || !planNameInput.trim()) return;

    // Only send items the user explicitly staged (placed in scene OR in unfitItems).
    // Items browsed from catalog but not staged (addItem only, no placement) are excluded.
    const activeIds = new Set([
      ...placements.map((p) => p.itemId),
      ...unfitItems.map((u) => u.item.id),
    ]);
    const activeItems = items.filter((si) => activeIds.has(si.item.id));
    if (activeItems.length === 0) return;

    // Deduplicate by itemId in case selectedItems accumulated duplicates.
    const deduped = new Map<string, (typeof items)[number]>();
    for (const si of activeItems) {
      if (!deduped.has(si.item.id)) deduped.set(si.item.id, si);
    }
    const itemsToSend = [...deduped.values()];

    const itemGroupMap = new Map<string, string>();
    for (const g of inlineGroups) {
      for (const itemId of g.itemIds) {
        itemGroupMap.set(itemId, g.id);
      }
    }

    const groups =
      inlineGroups.length > 0
        ? inlineGroups.map((g, idx) => ({
            clientGroupId: g.id,
            name: g.name,
            color: g.color,
            unloadingOrder: idx + 1,
          }))
        : undefined;

    // All selected vehicles in their current order — waterfall processes them sequentially.
    const vehicleIds = selectedVehicles.map((e) => e.vehicle.id);

    const id = await createPlan({
      planName: planNameInput.trim(),
      vehicleIds,
      items: itemsToSend.map((si) => ({
        itemId: si.item.id,
        quantity: si.quantity,
        groupId: itemGroupMap.get(si.item.id),
      })),
      optimizationCriteria: criteria,
      clusterGroups,
      allowContamination,
      groups,
    });
    navigate(planningDetailRoute(id), { replace: true });
  }, [planNameInput, createPlan, navigate]);

  const handleOptimize = useCallback(() => {
    const { selectedVehicles, placements, unfitItems } = usePlanStore.getState();
    if (selectedVehicles.length === 0) return;
    if (placements.length === 0 && unfitItems.length === 0) return;

    if (!planNameInput.trim()) {
      toast.error('Lütfen bir plan adı girin.');
      planNameInputRef.current?.focus();
      return;
    }

    void handleConfirmCreate();
  }, [planNameInput, handleConfirmCreate]);

  const handleReoptimize = useCallback(async () => {
    if (!fromPlanId) return;
    const {
      selectedVehicle: vehicle,
      selectedItems: items,
      placements,
      unfitItems,
      criteria,
      clusterGroups,
      allowContamination,
      inlineGroups,
    } = usePlanStore.getState();
    if (!vehicle || items.length === 0) return;

    // Only send items the user explicitly staged (placed OR previously unfit) —
    // prevents catalog-browsed-but-not-staged items from leaking into re-optimization.
    const activeIds = new Set([
      ...placements.map((p) => p.itemId),
      ...unfitItems.map((u) => u.item.id),
    ]);
    const activeItems = items.filter((si) => activeIds.has(si.item.id));

    // Deduplicate by itemId in case selectedItems has accumulated duplicates.
    const dedupedMap = new Map<string, (typeof items)[number]>();
    for (const si of activeItems) {
      if (!dedupedMap.has(si.item.id)) dedupedMap.set(si.item.id, si);
    }
    const dedupedItems = [...dedupedMap.values()];
    if (dedupedItems.length === 0) return;

    const itemGroupMap = new Map<string, string>();
    for (const g of inlineGroups) {
      for (const itemId of g.itemIds) {
        itemGroupMap.set(itemId, g.id);
      }
    }

    const groups =
      inlineGroups.length > 0
        ? inlineGroups.map((g, idx) => ({
            clientGroupId: g.id,
            name: g.name,
            color: g.color,
            unloadingOrder: idx + 1,
          }))
        : undefined;

    // Send ALL selected vehicles in their current order — waterfall requires full list
    const { selectedVehicles } = usePlanStore.getState();
    const vehicleIds =
      selectedVehicles.length > 0 ? selectedVehicles.map((e) => e.vehicle.id) : [vehicle.id];

    await reoptimizePlan({
      id: fromPlanId,
      vehicleIds,
      items: dedupedItems.map((si) => ({
        itemId: si.item.id,
        quantity: si.quantity,
        groupId: itemGroupMap.get(si.item.id),
      })),
      optimizationCriteria: criteria,
      clusterGroups,
      allowContamination,
      groups,
    });
    setRefetchKey((k) => k + 1);
    setAnimationReady(true);
  }, [fromPlanId, reoptimizePlan, setAnimationReady]);

  const handleAddSuggestedVehicle = useCallback(
    async (vehicle: Vehicle) => {
      usePlanStore.getState().addVehicle(vehicle);
      await handleReoptimize();
    },
    [handleReoptimize],
  );

  return (
    <ReadOnlyContext.Provider value={readOnly}>
      <div className="flex flex-col h-full bg-page-background overflow-hidden">
        {!readOnly && fromPlanId && (
          <PlanAutoLoader
            planId={fromPlanId}
            refetchKey={refetchKey}
            onVehicleSelected={handleVehicleSelected}
            onLoaded={handleLoaded}
          />
        )}
        {/* ── Üst satır: şeritler + viewport + kayan paneller ─────────────── */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* Sol panel toggle butonu — beyaz kart sağ sınırı (308px) üzerinde */}
          <button
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? 'Ürünler panelini kapat' : 'Ürünler panelini aç'}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-20',
              'h-6 w-6 flex items-center justify-center rounded-full',
              'border border-border bg-background text-muted-foreground shadow-sm',
              'transition-[left] duration-[220ms] ease-out hover:text-foreground',
              leftOpen ? 'left-[296px]' : 'left-3',
            )}
          >
            {leftOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>

          {/* Plan adı kutusu — sol üst, kamera butonlarıyla simetrik */}
          {!readOnly && (
            <div className="absolute top-3 left-0 w-[320px] z-20 px-3">
              <div className="w-full flex items-center gap-1.5 bg-background rounded-xl border border-border px-2 py-1.5 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-shadow">
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <Input
                  ref={planNameInputRef}
                  value={planNameInput}
                  onChange={(e) => setPlanNameInput(e.target.value)}
                  onBlur={() => {
                    if (fromPlanId) handlePlanNameCommit();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (fromPlanId) handlePlanNameCommit();
                      else if (planNameInput.trim()) void handleConfirmCreate();
                    }
                  }}
                  placeholder={fromPlanId ? 'Plan adı' : 'Plan adı girin…'}
                  className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs px-0"
                />
              </div>
            </div>
          )}

          {/* Sol kayan panel */}
          <div
            className={cn(
              'absolute bottom-3 left-0 w-[320px] z-10 px-3',
              !readOnly ? 'top-[68px]' : 'top-3',
              'transition-transform duration-[220ms] ease-out',
              leftOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <div className="h-full bg-background rounded-xl border border-border overflow-hidden">
              <PlanLeftPanel
                planId={fromPlanId}
                onAddSuggestedVehicle={fromPlanId ? handleAddSuggestedVehicle : undefined}
              />
            </div>
          </div>

          {/* Kamera presetleri — sağ üst */}
          <div className="absolute top-3 right-0 w-[320px] z-20 px-3">
            <CameraPresetButtons />
          </div>

          {/* Merkez — 3D Viewport */}
          <div className="flex-1 min-w-0 p-3 overflow-hidden">
            <div className="relative h-full rounded-xl bg-background border border-border overflow-hidden">
              <PlanCanvas snapshotRef={snapshotRef} />
            </div>
          </div>

          {/* Sağ panel — her zaman görünür, araç listesi toggle ile açılır/kapanır */}
          <div className="absolute top-[68px] bottom-3 right-0 w-[320px] z-10 px-3">
            <PlanRightPanel
              vehiclesOpen={rightOpen}
              onToggleVehicles={() => setRightOpen((v) => !v)}
              onOptimize={fromPlanId ? handleReoptimize : handleOptimize}
              isOptimizing={fromPlanId ? isReoptimizing : isCreating}
              canOptimize={fromPlanId ? !isReoptimizing : !isCreating}
              getSnapshot={() => snapshotRef.current?.() ?? ''}
              planId={fromPlanId}
              planName={planDetail?.planName}
            />
          </div>
        </div>
      </div>
    </ReadOnlyContext.Provider>
  );
}
