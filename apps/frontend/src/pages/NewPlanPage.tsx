import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { PlanLeftPanel } from '@/features/planning/components/PlanLeftPanel';
import { PlanRightPanel } from '@/features/planning/components/PlanRightPanel';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import { BalancePanel } from '@/features/planning/components/scene/BalancePanel';
import { cn } from '@/lib/utils';
import { useLoadingPlanListItem, useLoadingPlanProducts } from '@/lib/api/useLoadingPlans';
import { useItems } from '@/lib/api/useItems';
import { SCENE } from '@/lib/config/scene-config';
import { VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import { usePlanStore } from '@/lib/store/usePlanStore';

// ─── PlanAutoLoader ───────────────────────────────────────────────────────────

interface PlanAutoLoaderProps {
  planId: string;
  onVehicleSelected: () => void;
}

function PlanAutoLoader({ planId, onVehicleSelected }: PlanAutoLoaderProps) {
  const { data: plan } = useLoadingPlanListItem(planId);
  const { data: productGroups = [], isLoading: productsLoading } = useLoadingPlanProducts(planId);
  const { data: itemsPage } = useItems({ pageSize: 100 });
  const allItems = useMemo(() => itemsPage?.items ?? [], [itemsPage]);

  const vehicle = useMemo(
    (): Vehicle | null =>
      plan && plan.vehicleId
        ? {
            id: plan.vehicleId,
            name: plan.vehicleName,
            plate: plan.vehiclePlate,
            width: plan.interiorWidthM,
            height: plan.interiorHeightM,
            length: plan.interiorDepthM,
            maxCargoWeight: plan.vehicleCapacityKg,
            vehicleType: plan.vehicleType ?? VehicleType.Tir,
            doorDirection: plan.doorDirection ?? DoorDirection.Rear,
            doorSide: plan.doorSide,
            isFavorite: false,
            isActive: true,
            isDeleted: false,
            createdAt: new Date(0).toISOString(),
            createdBy: { id: '', fullName: '' },
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan?.vehicleId],
  );

  const setVehicle = usePlanStore((s) => s.setVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  const vehicleSetRef = useRef(false);
  const placementsAppliedRef = useRef(false);

  // Reset on planId change
  useEffect(() => {
    vehicleSetRef.current = false;
    placementsAppliedRef.current = false;
    usePlanStore.getState().reset();
  }, [planId]);

  // Step 1: araç seç
  useEffect(() => {
    if (vehicleSetRef.current || !vehicle || selectedVehicle) return;
    setVehicle(vehicle);
    vehicleSetRef.current = true;
    onVehicleSelected();
  }, [vehicle, selectedVehicle, setVehicle, onVehicleSelected]);

  // Step 2: ürünleri doğrudan items API'sinden al, plan miktarlarıyla eşleştir, sahneye ekle
  // vehicle.id kontrolü: reset öncesi eski araçla erken tetiklenmeyi önler
  useEffect(() => {
    if (
      placementsAppliedRef.current ||
      !selectedVehicle ||
      selectedVehicle.id !== vehicle?.id ||
      productsLoading ||
      productGroups.length === 0 ||
      allItems.length === 0
    )
      return;

    placementsAppliedRef.current = true;

    const quantityMap = new Map<string, number>(
      productGroups.flatMap((g) => g.products.map((p) => [p.id, p.quantity])),
    );

    const planItemIds = new Set(productGroups.flatMap((g) => g.products.map((p) => p.id)));

    const storeItems = allItems
      .filter((item) => planItemIds.has(item.id))
      .map((item) => ({ item, quantity: quantityMap.get(item.id) ?? 1 }));

    if (storeItems.length === 0) return;

    const colorMap: Record<string, string> = {};
    storeItems.forEach((si, i) => {
      colorMap[si.item.sku] = SCENE.COLORS.SKU_PALETTE[i % SCENE.COLORS.SKU_PALETTE.length];
    });

    initItems(storeItems, colorMap);

    const { selectedItems: current } = usePlanStore.getState();
    for (const { item } of current) {
      usePlanStore.getState().togglePlacement(item.id);
    }
  }, [selectedVehicle, vehicle, productsLoading, productGroups, allItems, initItems]);

  return null;
}

export function NewPlanPage() {
  const snapshotRef = useRef<(() => string) | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const fromPlanId = searchParams.get('fromPlan');

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
          />
        </div>
      </div>
    </div>
  );
}
