import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
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
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const setUnplacedItems = usePlanStore((s) => s.setUnplacedItems);
  const setPlanName = usePlanStore((s) => s.setPlanName);
  const setIsPlanDetail = usePlanStore((s) => s.setIsPlanDetail);
  const syncGroups = usePlanStore((s) => s.syncGroups);

  const appliedRef = useRef(false);

  useEffect(() => {
    appliedRef.current = false;
    usePlanStore.getState().reset();
  }, [planId, refetchKey]);

  useEffect(() => {
    if (appliedRef.current || !isSuccess || !data) return;

    appliedRef.current = true;

    if (data.vehicle) {
      setVehicle(data.vehicle);
      onVehicleSelected();
    }
    initItems(data.inputItems, data.skuColorMap);
    setPlacements(data.placements);
    setUnplacedItems(data.unplacedItems);
    setPlanName(data.planName ?? '');
    setIsPlanDetail(true);
    syncGroups(data.groups, data.itemGroupAssignments);
    onLoaded?.();
  }, [
    isSuccess,
    data,
    setVehicle,
    initItems,
    setPlacements,
    setUnplacedItems,
    setPlanName,
    setIsPlanDetail,
    syncGroups,
    onVehicleSelected,
    onLoaded,
  ]);

  return null;
}

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const pendingSnapshotPlanId = useRef<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 1024);
  const [rightOpen, setRightOpen] = useState(() => window.innerWidth >= 1024);

  const [refetchKey, setRefetchKey] = useState(0);
  const { id: fromPlanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();
  const { mutateAsync: reoptimizePlan, isPending: isReoptimizing } = useReoptimizeLoadingPlan();
  const { mutate: uploadThumbnail } = useUploadPlanThumbnail();
  const { mutateAsync: renamePlan } = useRenameLoadingPlan();

  const planName = usePlanStore((s) => s.planName);
  const placements = usePlanStore((s) => s.placements);

  useEffect(() => {
    if (!fromPlanId) {
      const { planName: name, isPlanDetail } = usePlanStore.getState();
      if (!name.trim() || isPlanDetail) {
        usePlanStore.getState().reset();
      }
    }
    // runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: planDetail } = useLoadingPlanDetail(fromPlanId ?? '');

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
  const startAnimation = useSceneStore((s) => s.startAnimation);

  const handleVehicleSelected = useCallback(() => {
    setRightOpen(false);
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    const {
      selectedVehicle: vehicle,
      selectedItems: items,
      placements,
      criteria,
      planName: name,
    } = usePlanStore.getState();
    if (!vehicle || !name.trim()) return;
    if (vehicle.id === '00000000-0000-0000-0000-000000000000') {
      toast.error('Seçili araç geçersiz. Lütfen araç listesinden tekrar seçin.', {
        position: 'bottom-right',
      });
      return;
    }

    const placedIds = new Set(placements.map((p) => p.itemId));
    const itemsToSend = items.filter((si) => placedIds.has(si.item.id));
    if (itemsToSend.length === 0) return;

    try {
      const id = await createPlan({
        planName: name.trim(),
        vehicleIds: [vehicle.id],
        items: itemsToSend.map((si) => ({
          itemId: si.item.id,
          quantity: si.quantity,
        })),
        optimizationCriteria: criteria,
      });
      const dataUrl = snapshotRef.current?.();
      if (dataUrl) uploadThumbnail({ id, dataUrl });
      navigate(planningDetailRoute(id), { replace: true });
    } catch {
      // onError in useCreateLoadingPlan handles the toast
    }
  }, [createPlan, navigate, uploadThumbnail]);

  const handleOptimize = useCallback(() => {
    const {
      selectedVehicle: vehicle,
      selectedItems: items,
      placements,
      planName: name,
    } = usePlanStore.getState();
    if (!vehicle || items.length === 0 || !name.trim()) return;
    const placedIds = new Set(placements.map((p) => p.itemId));
    if (items.filter((si) => placedIds.has(si.item.id)).length === 0) return;
    void handleConfirmCreate();
  }, [handleConfirmCreate]);

  const handlePlanLoaded = useCallback(() => {
    const planId = pendingSnapshotPlanId.current;
    if (!planId) return;
    pendingSnapshotPlanId.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dataUrl = snapshotRef.current?.();
        if (dataUrl) uploadThumbnail({ id: planId, dataUrl });
      });
    });
  }, [uploadThumbnail]);

  const handleLoadAnimation = useCallback(() => {
    if (usePlanStore.getState().placements.length === 0) return;
    startAnimation();
  }, [startAnimation]);

  const handleReoptimize = useCallback(async () => {
    if (!fromPlanId) return;
    const {
      selectedVehicle: vehicle,
      selectedItems: items,
      criteria,
      groups,
      itemGroupAssignments,
    } = usePlanStore.getState();
    if (!vehicle || items.length === 0) return;
    if (vehicle.id === '00000000-0000-0000-0000-000000000000') {
      toast.error('Seçili araç geçersiz. Lütfen araç listesinden tekrar seçin.', {
        position: 'bottom-right',
      });
      return;
    }

    try {
      await reoptimizePlan({
        id: fromPlanId,
        vehicleIds: [vehicle.id],
        items: items.map((si) => ({
          itemId: si.item.id,
          quantity: si.quantity,
          ...(itemGroupAssignments[si.item.id]
            ? { groupId: itemGroupAssignments[si.item.id] }
            : {}),
        })),
        optimizationCriteria: criteria,
        ...(groups.length > 0 ? { groups } : {}),
      });
      pendingSnapshotPlanId.current = fromPlanId;
      setRefetchKey((k) => k + 1);
      setAnimationReady(true);
    } catch {
      // onError in useReoptimizeLoadingPlan handles the toast
    }
  }, [fromPlanId, reoptimizePlan, setAnimationReady]);

  const handleRenamePlan = useCallback(
    async (name: string) => {
      if (!fromPlanId) return;
      usePlanStore.getState().setPlanName(name);
      await renamePlan({ id: fromPlanId, planName: name });
    },
    [fromPlanId, renamePlan],
  );

  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      {fromPlanId && (
        <PlanAutoLoader
          planId={fromPlanId}
          refetchKey={refetchKey}
          onVehicleSelected={handleVehicleSelected}
          onLoaded={handlePlanLoaded}
        />
      )}
      {/* ── Üst satır: şeritler + viewport + kayan paneller ─────────────── */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Sol panel toggle butonu */}
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

        {/* Sol kayan panel */}
        <div
          className={cn(
            'absolute top-3 bottom-3 left-0 w-[320px] z-10 px-3',
            'transition-transform duration-[220ms] ease-out',
            leftOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="h-full bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <PlanLeftPanel
              fromPlanId={fromPlanId}
              onRenamePlan={fromPlanId ? handleRenamePlan : undefined}
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

        {/* Sağ panel */}
        <div className="absolute top-[68px] bottom-3 right-0 w-[320px] z-10 px-3">
          <PlanRightPanel
            vehiclesOpen={rightOpen}
            onToggleVehicles={() => setRightOpen((v) => !v)}
            onOptimize={fromPlanId ? handleReoptimize : handleOptimize}
            onLoadAnimation={handleLoadAnimation}
            isOptimizing={fromPlanId ? isReoptimizing : isCreating}
            canOptimize={
              fromPlanId
                ? !isReoptimizing
                : !isCreating && !!planName.trim() && placements.length > 0
            }
            getSnapshot={() => snapshotRef.current?.() ?? ''}
            planId={fromPlanId}
            planName={planDetail?.planName}
          />
        </div>
      </div>
    </div>
  );
}
