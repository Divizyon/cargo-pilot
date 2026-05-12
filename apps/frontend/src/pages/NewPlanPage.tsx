import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { BalancePanel } from '@/features/planning/components/scene/BalancePanel';
import { cn } from '@/lib/utils';
import { useLoadingPlanDetail, useCreateLoadingPlan } from '@/lib/api/useLoadingPlans';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { planningDetailRoute } from '@/lib/config/routes';

// ─── PlanAutoLoader ───────────────────────────────────────────────────────────

interface PlanAutoLoaderProps {
  planId: string;
  onVehicleSelected: () => void;
}

function PlanAutoLoader({ planId, onVehicleSelected }: PlanAutoLoaderProps) {
  const { data, isSuccess } = useLoadingPlanDetail(planId);

  const setVehicle = usePlanStore((s) => s.setVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);

  const appliedRef = useRef(false);

  useEffect(() => {
    appliedRef.current = false;
    usePlanStore.getState().reset();
  }, [planId]);

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
  const { id: fromPlanId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutateAsync: createPlan, isPending: isCreating } = useCreateLoadingPlan();

  const resetDoneRef = useRef(false);
  if (!fromPlanId && !resetDoneRef.current) {
    resetDoneRef.current = true;
    usePlanStore.getState().reset();
  }

  const handleOptimize = useCallback(async () => {
    const { selectedVehicle, selectedItems, placements, criteria } = usePlanStore.getState();
    if (!selectedVehicle || selectedItems.length === 0) return;

    const placedIds = new Set(placements.map((p) => p.itemId));
    const itemsToSend = selectedItems.filter((si) => placedIds.has(si.item.id));
    if (itemsToSend.length === 0) return;

    const planName = `${selectedVehicle.name} — ${new Date().toLocaleDateString('tr-TR')}`;
    const id = await createPlan({
      planName,
      vehicleId: selectedVehicle.id,
      items: itemsToSend.map((si) => ({ itemId: si.item.id, quantity: si.quantity })),
      optimizationCriteria: criteria,
    });
    navigate(planningDetailRoute(id), { replace: true });
  }, [createPlan, navigate]);

  return (
    <div className="flex flex-col h-full bg-zinc-100 overflow-hidden">
      {fromPlanId && (
        <PlanAutoLoader planId={fromPlanId} onVehicleSelected={() => setRightOpen(false)} />
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
            onOptimize={fromPlanId ? undefined : handleOptimize}
            isOptimizing={isCreating}
          />
        </div>
      </div>
    </div>
  );
}
