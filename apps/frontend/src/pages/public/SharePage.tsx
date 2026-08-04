import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useShareByToken, useRecordShareView, isShareExpiredError } from '@/lib/api/useShareLinks';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { NewPlanPage } from '@/pages/plans/NewPlanPage';
import { VehicleType, DoorDirection } from '@/lib/types/vehicle';
import { ProductType } from '@/lib/types/item';
import type { AxiosError } from 'axios';
import type { SharePlan } from '@/lib/types/share';
import type { Vehicle } from '@/lib/types/vehicle';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRODUCT_TYPE_MAP: Record<string, ProductType> = {
  koli: ProductType.Koli,
  varil: ProductType.Varil,
  palet: ProductType.Palet,
};

function resolveProductType(raw: string | number | null | undefined): ProductType {
  if (raw == null) return ProductType.Koli;
  if (typeof raw === 'string') return PRODUCT_TYPE_MAP[raw.toLowerCase()] ?? ProductType.Koli;
  // numeric fallback: 0=koli, 1=varil, 2=palet (adjust if backend differs)
  const numMap: Record<number, ProductType> = {
    0: ProductType.Koli,
    1: ProductType.Varil,
    2: ProductType.Palet,
  };
  return numMap[raw] ?? ProductType.Koli;
}

// ─── SharePlanLoader ─────────────────────────────────────────────────────────

interface SharePlanLoaderProps {
  plan: SharePlan;
  onLoaded: () => void;
}

function SharePlanLoader({ plan, onLoaded }: SharePlanLoaderProps) {
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    if (!plan.vehicleData || !plan.placements) return;
    applied.current = true;

    const vd = plan.vehicleData;

    const vehicle: Vehicle = {
      id: vd.id ?? crypto.randomUUID(),
      name: plan.vehicleName,
      vehicleType: (vd.vehicleType as Vehicle['vehicleType']) ?? VehicleType.Kamyon,
      length: vd.length ?? 100,
      width: vd.width ?? 100,
      height: vd.height ?? 100,
      maxCargoWeight: plan.vehicleCapacityKg,
      doorDirection: (vd.doorDirection as Vehicle['doorDirection']) ?? DoorDirection.Rear,
      plate: plan.vehiclePlate ?? undefined,
      isFavorite: false,
      isActive: true,
      isDeleted: false,
      createdAt: plan.createdAt,
      createdBy: { id: '', fullName: '' },
    };

    const placements: PlacementWithDimensions[] = plan.placements.map((p) => ({
      itemId: p.itemId,
      positionX: p.positionX,
      positionY: p.positionY,
      positionZ: p.positionZ,
      width: p.width,
      height: p.height,
      depth: p.depth,
      orientationIndex: p.orientationIndex as PlacementWithDimensions['orientationIndex'],
      layer: Math.max(1, p.layer),
      isViolation: p.isViolation,
      color: p.color ?? undefined,
      weight: p.weight,
      productType: resolveProductType(p.productType),
    }));

    // Build synthetic items grouped by itemId for the left panel item list
    const itemMap = new Map<string, { p: (typeof plan.placements)[0]; count: number }>();
    for (const p of plan.placements) {
      const existing = itemMap.get(p.itemId);
      if (existing) {
        existing.count += 1;
      } else {
        itemMap.set(p.itemId, { p, count: 1 });
      }
    }

    const skuColorMap: Record<string, string> = {};
    const items: Array<{ item: Item; quantity: number }> = Array.from(itemMap.entries()).map(
      ([id, { p, count }], idx) => {
        const sku = p.productSku?.trim() || id.substring(0, 8).toUpperCase();
        const name = p.productName?.trim() || `Ürün ${idx + 1}`;
        if (p.color) skuColorMap[sku] = p.color;
        return {
          item: {
            id,
            name,
            sku,
            productType: resolveProductType(p.productType),
            width: p.width,
            height: p.height,
            length: p.depth,
            weight: Math.max(0.001, p.weight),
            isStackable: true,
            maxStackCount: 1,
            maxWeightOnTop: null,
            fragility: 0,
            allowRotateX: true,
            allowRotateY: true,
            allowRotateZ: true,
            allowFaceBottom: true,
            allowFaceTop: true,
            allowFaceFront: true,
            allowFaceBack: true,
            allowFaceLeft: true,
            allowFaceRight: true,
          },
          quantity: count,
        };
      },
    );

    const store = usePlanStore.getState();
    store.reset();
    store.setVehicle(vehicle);
    store.initItems(items, skuColorMap);
    store.setPlacements(placements);
    onLoaded();
  }, [plan, onLoaded]);

  return null;
}

// ─── SharePage ────────────────────────────────────────────────────────────────

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data: plan, isLoading, isError, error } = useShareByToken(token ?? '');
  const { mutate: recordView } = useRecordShareView();
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (token) recordView(token);
  }, [token, recordView]);

  useEffect(() => {
    return () => {
      usePlanStore.getState().reset();
    };
  }, []);

  const isExpired = isShareExpiredError(error);
  const is404 = !isExpired && (error as AxiosError | null)?.response?.status === 404;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <header className="bg-white border-b border-zinc-200 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  // Süre kontrolü sunucuda yapıldığı için süresi dolmuş bağlantı plan verisi
  // döndürmez; bu yüzden hata dalından önce değerlendirilir.
  if (isExpired) {
    return (
      <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <Clock className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-lg font-semibold text-zinc-800">Bağlantı Süresi Doldu</h1>
          <p className="text-sm text-zinc-500">
            Bu paylaşım bağlantısının geçerlilik süresi sona ermiştir.
          </p>
        </div>
      </main>
    );
  }

  if (isError || is404 || !plan) {
    return (
      <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <AlertCircle className="w-10 h-10 text-zinc-400 mx-auto" />
          <h1 className="text-lg font-semibold text-zinc-800">Bağlantı Bulunamadı</h1>
          <p className="text-sm text-zinc-500">
            Bu paylaşım bağlantısı geçersiz veya silinmiş olabilir.
          </p>
        </div>
      </main>
    );
  }

  if (plan.isExpired) {
    return (
      <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-6">
          <Clock className="w-10 h-10 text-amber-400 mx-auto" />
          <h1 className="text-lg font-semibold text-zinc-800">Bağlantı Süresi Doldu</h1>
          <p className="text-sm text-zinc-500">
            Bu paylaşım bağlantısının geçerlilik süresi sona ermiştir.
          </p>
        </div>
      </main>
    );
  }

  const has3DData = Boolean(plan.vehicleData && plan.placements?.length);

  return (
    <>
      {has3DData && <SharePlanLoader plan={plan} onLoaded={() => setSceneReady(true)} />}
      {has3DData && sceneReady ? (
        <div className="flex flex-col" style={{ height: '100dvh' }}>
          <header className="bg-background border-b border-border px-4 py-2 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">CargoPilot</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-sm text-muted-foreground">Paylaşılan Yükleme Planı</span>
            </div>
            <span className="text-xs text-muted-foreground">{plan.planName}</span>
          </header>
          <div className="flex-1 min-h-0">
            <NewPlanPage readOnly />
          </div>
        </div>
      ) : has3DData ? (
        <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </main>
      ) : null}
    </>
  );
}
