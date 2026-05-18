import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { BalancePanel } from '@/features/planning/components/scene/BalancePanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  useLoadingPlanDetail,
  useCreateLoadingPlan,
  useReoptimizeLoadingPlan,
  useUploadPlanThumbnail,
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
  const addVehicle = usePlanStore((s) => s.addVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const setUnplacedItems = usePlanStore((s) => s.setUnplacedItems);

  const appliedRef = useRef(false);

  useEffect(() => {
    appliedRef.current = false;
    usePlanStore.getState().reset();
  }, [planId, refetchKey]);

  useEffect(() => {
    if (appliedRef.current || !isSuccess || !data) return;

    const allVehicles = data.vehicles.length > 0 ? data.vehicles : data.vehicle ? [data.vehicle] : [];
    if (allVehicles.length === 0) return;

    appliedRef.current = true;

    // Birden fazla araç varsa hepsini store'a ekle; birincisi primary olarak setVehicle ile atanır.
    setVehicle(allVehicles[0]);
    for (let i = 1; i < allVehicles.length; i++) {
      addVehicle(allVehicles[i]);
    }

    onVehicleSelected();
    initItems(data.inputItems, data.skuColorMap);
    setPlacements(data.placements);
    setUnplacedItems(data.unplacedItems);
    onLoaded?.();
  }, [
    isSuccess,
    data,
    setVehicle,
    addVehicle,
    initItems,
    setPlacements,
    setUnplacedItems,
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
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [planNameInput, setPlanNameInput] = useState('');
  const { id: fromPlanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();
  const { mutateAsync: reoptimizePlan, isPending: isReoptimizing } = useReoptimizeLoadingPlan();
  const { mutate: uploadThumbnail } = useUploadPlanThumbnail();

  useEffect(() => {
    if (!fromPlanId) {
      usePlanStore.getState().reset();
    }
    // fromPlanId is from URL params and stable per mount
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

  const handleOptimize = useCallback(() => {
    const { selectedVehicles, selectedItems: items } = usePlanStore.getState();
    if (selectedVehicles.length === 0 || items.length === 0) return;

    const defaultName = `${selectedVehicles[0].vehicle.name} — ${new Date().toLocaleDateString('tr-TR')}`;
    setPlanNameInput(defaultName);
    setNameDialogOpen(true);
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    const {
      selectedVehicles,
      selectedItems: items,
      criteria,
    } = usePlanStore.getState();
    if (selectedVehicles.length === 0 || !planNameInput.trim()) return;
    if (items.length === 0) return;

    setNameDialogOpen(false);

    let newId: string;
    try {
      newId = await createPlan({
        planName: planNameInput.trim(),
        vehicleIds: selectedVehicles.map((e) => e.vehicle.id),
        items: items.map((si) => ({ itemId: si.item.id, quantity: si.quantity })),
        optimizationCriteria: criteria,
      });
    } catch {
      return;
    }

    const dataUrl = snapshotRef.current?.();
    if (dataUrl) uploadThumbnail({ id: newId, dataUrl });

    navigate(planningDetailRoute(newId), { replace: true });
  }, [planNameInput, createPlan, navigate, uploadThumbnail]);

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
      selectedVehicles,
      selectedItems: items,
      criteria,
    } = usePlanStore.getState();
    if (selectedVehicles.length === 0 || items.length === 0) return;

    await reoptimizePlan({
      id: fromPlanId,
      vehicleIds: selectedVehicles.map((e) => e.vehicle.id),
      items: items.map((si) => ({ itemId: si.item.id, quantity: si.quantity })),
      optimizationCriteria: criteria,
    });
    pendingSnapshotPlanId.current = fromPlanId;
    setRefetchKey((k) => k + 1);
    setAnimationReady(true);
  }, [fromPlanId, reoptimizePlan, setAnimationReady]);

  return (
    <div className="flex flex-col h-full bg-muted overflow-hidden">
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Plan Adı</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="plan-name" className="text-xs text-muted-foreground mb-1.5 block">
              Yükleme planına bir ad verin
            </Label>
            <Input
              id="plan-name"
              value={planNameInput}
              onChange={(e) => setPlanNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleConfirmCreate();
              }}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNameDialogOpen(false)}>
              İptal
            </Button>
            <Button
              size="sm"
              disabled={!planNameInput.trim() || isCreating}
              onClick={() => void handleConfirmCreate()}
              className="bg-foreground text-background hover:bg-foreground/80"
            >
              {isCreating ? 'Oluşturuluyor…' : 'Optimizasyonu Başlat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        {/* BalancePanel — sağ panelin solunda */}
        <div className="absolute top-[68px] right-[320px] z-20 pointer-events-none">
          <BalancePanel />
        </div>

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

        {/* Sol kayan panel */}
        <div
          className={cn(
            'absolute top-3 bottom-3 left-0 w-[320px] z-10 px-3',
            'transition-transform duration-[220ms] ease-out',
            leftOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="h-full bg-background rounded-xl border border-border overflow-hidden">
            <PlanLeftPanel />
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
            onLoadAnimation={handleLoadAnimation}
            isOptimizing={fromPlanId ? isReoptimizing : isCreating}
            canOptimize={fromPlanId ? !isReoptimizing : !isCreating}
            getSnapshot={() => snapshotRef.current?.() ?? ''}
            planId={fromPlanId}
            planName={planDetail?.planName}
          />
        </div>
      </div>
    </div>
  );
}
