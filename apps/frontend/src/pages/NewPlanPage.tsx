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
} from '@/lib/api/useLoadingPlans';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { planningDetailRoute } from '@/lib/config/routes';

// ─── PlanAutoLoader ───────────────────────────────────────────────────────────

interface PlanAutoLoaderProps {
  planId: string;
  refetchKey?: number;
  onVehicleSelected: () => void;
}

function PlanAutoLoader({ planId, refetchKey = 0, onVehicleSelected }: PlanAutoLoaderProps) {
  const { data, isSuccess } = useLoadingPlanDetail(planId);

  const setVehicle = usePlanStore((s) => s.setVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);

  const appliedRef = useRef(false);

  useEffect(() => {
    appliedRef.current = false;
    usePlanStore.getState().reset();
  }, [planId, refetchKey]);

  useEffect(() => {
    if (appliedRef.current || !isSuccess || !data) return;
    if (!data.vehicle) return;

    appliedRef.current = true;

    setVehicle(data.vehicle);
    onVehicleSelected();
    initItems(data.inputItems, data.skuColorMap);
    setPlacements(data.placements);
  }, [isSuccess, data, setVehicle, initItems, setPlacements, onVehicleSelected]);

  return null;
}

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [planNameInput, setPlanNameInput] = useState('');
  const { id: fromPlanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();
  const { mutateAsync: reoptimizePlan, isPending: isReoptimizing } = useReoptimizeLoadingPlan();

  const initialStateRef = useRef<{ vehicleId: string; itemsKey: string } | null>(null);

  useEffect(() => {
    if (!fromPlanId) {
      usePlanStore.getState().reset();
    }
    // fromPlanId is from URL params and stable per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const setAnimationReady = useSceneStore((s) => s.setAnimationReady);
  const startAnimation = useSceneStore((s) => s.startAnimation);

  // Detect changes from initial loaded state
  useEffect(() => {
    if (!fromPlanId || !initialStateRef.current) return;
    const itemsKey = selectedItems
      .map((si) => `${si.item.id}:${si.quantity}`)
      .sort()
      .join(',');
    const vehicleId = selectedVehicle?.id ?? '';
    setIsDirty(
      vehicleId !== initialStateRef.current.vehicleId ||
        itemsKey !== initialStateRef.current.itemsKey,
    );
  }, [selectedVehicle, selectedItems, fromPlanId]);

  const handleVehicleSelected = useCallback(() => {
    setRightOpen(false);
    // Defer snapshot: PlanAutoLoader calls this before initItems/setPlacements complete
    setTimeout(() => {
      const state = usePlanStore.getState();
      const itemsKey = state.selectedItems
        .map((si) => `${si.item.id}:${si.quantity}`)
        .sort()
        .join(',');
      initialStateRef.current = { vehicleId: state.selectedVehicle?.id ?? '', itemsKey };
      setIsDirty(false);
    }, 0);
  }, []);

  const handleOptimize = useCallback(() => {
    const { selectedVehicle: vehicle, selectedItems: items, placements } = usePlanStore.getState();
    if (!vehicle || items.length === 0) return;
    const placedIds = new Set(placements.map((p) => p.itemId));
    if (items.filter((si) => placedIds.has(si.item.id)).length === 0) return;

    const defaultName = `${vehicle.name} — ${new Date().toLocaleDateString('tr-TR')}`;
    setPlanNameInput(defaultName);
    setNameDialogOpen(true);
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    const {
      selectedVehicle: vehicle,
      selectedItems: items,
      placements,
      criteria,
    } = usePlanStore.getState();
    if (!vehicle || !planNameInput.trim()) return;

    const placedIds = new Set(placements.map((p) => p.itemId));
    const itemsToSend = items.filter((si) => placedIds.has(si.item.id));
    if (itemsToSend.length === 0) return;

    setNameDialogOpen(false);
    const id = await createPlan({
      planName: planNameInput.trim(),
      vehicleId: vehicle.id,
      items: itemsToSend.map((si) => ({ itemId: si.item.id, quantity: si.quantity })),
      optimizationCriteria: criteria,
    });
    navigate(planningDetailRoute(id), { replace: true });
  }, [planNameInput, createPlan, navigate]);

  const handleLoadAnimation = useCallback(() => {
    if (usePlanStore.getState().placements.length === 0) return;
    startAnimation();
  }, [startAnimation]);

  const handleReoptimize = useCallback(async () => {
    if (!fromPlanId) return;
    const { selectedVehicle: vehicle, selectedItems: items, criteria } = usePlanStore.getState();
    if (!vehicle || items.length === 0) return;

    await reoptimizePlan({
      id: fromPlanId,
      vehicleId: vehicle.id,
      items: items.map((si) => ({ itemId: si.item.id, quantity: si.quantity })),
      optimizationCriteria: criteria,
    });
    setRefetchKey((k) => k + 1);
    setAnimationReady(true);
  }, [fromPlanId, reoptimizePlan, setAnimationReady]);

  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Plan Adı</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="plan-name" className="text-xs text-zinc-500 mb-1.5 block">
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
              className="bg-zinc-900 text-white hover:bg-zinc-700"
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
          <div className="h-full bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <PlanLeftPanel />
          </div>
        </div>

        {/* Kamera presetleri — sağ üst */}
        <div className="absolute top-3 right-3 z-20">
          <CameraPresetButtons getSnapshot={() => snapshotRef.current?.() ?? ''} />
        </div>

        {/* Merkez — 3D Viewport */}
        <div className="flex-1 min-w-0 p-3 overflow-hidden">
          <div className="relative h-full rounded-xl bg-white border border-zinc-200 overflow-hidden">
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
            canOptimize={fromPlanId ? isDirty : true}
          />
        </div>
      </div>
    </div>
  );
}
