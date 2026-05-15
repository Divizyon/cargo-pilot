import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Clock, Package2, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useShareByToken,
  useRecordShareView,
  useSharePlanFullDetail,
} from '@/lib/api/useShareLinks';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { PlanCanvas } from '@/features/planning/components/scene/PlanCanvas';
import { CameraPresetButtons } from '@/features/planning/components/scene/CameraPresetButtons';
import type { AxiosError } from 'axios';
import type { PlanFullDetail } from '@/lib/api/loadingPlanMappers';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  tamamlandi: {
    label: 'Tamamlandı',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  aktif: { label: 'Aktif', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  taslak: { label: 'Taslak', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  iptal: { label: 'İptal', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

// ─── ShareAutoLoader ──────────────────────────────────────────────────────────

function ShareAutoLoader({ detail }: { detail: PlanFullDetail }) {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const initItems = usePlanStore((s) => s.initItems);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !detail.vehicle) return;
    applied.current = true;
    setVehicle(detail.vehicle);
    initItems(detail.inputItems, detail.skuColorMap);
    setPlacements(detail.placements);
  }, [detail, setVehicle, initItems, setPlacements]);

  return null;
}

// ─── ShareBoxInfo ─────────────────────────────────────────────────────────────

function ShareBoxInfo() {
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  if (selectedInstanceId === null) return null;
  const placement = placements[selectedInstanceId];
  if (!placement) return null;
  const entry = selectedItems.find((si) => si.item.id === placement.itemId);
  if (!entry) return null;
  const { item } = entry;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10">
      <div className="flex items-center gap-3 rounded-lg bg-black/70 px-4 py-2.5 text-xs text-white backdrop-blur-sm whitespace-nowrap">
        <span className="font-medium max-w-[220px] truncate">{item.name}</span>
        <span className="text-zinc-500">·</span>
        <span className="font-mono text-zinc-300">
          {placement.width}×{placement.height}×{placement.depth} cm
        </span>
        {item.weight > 0 && (
          <>
            <span className="text-zinc-500">·</span>
            <span className="font-mono text-zinc-300">{item.weight} kg</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SharePage ────────────────────────────────────────────────────────────────

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data: plan, isLoading, isError, error } = useShareByToken(token ?? '');
  const { data: planDetail } = useSharePlanFullDetail(token ?? '');
  const { mutate: recordView } = useRecordShareView();
  const weightUnit = useUnitStore((s) => s.weightUnit);

  useEffect(() => {
    if (token) recordView(token);
  }, [token, recordView]);

  useEffect(
    () => () => {
      usePlanStore.getState().reset();
    },
    [],
  );

  const is404 = (error as AxiosError | null)?.response?.status === 404;
  const has3D =
    planDetail !== undefined &&
    (planDetail.placements.length ?? 0) > 0 &&
    planDetail.vehicle !== null;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-50">
        <header className="bg-white border-b border-zinc-200 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
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

  const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG['taslak'];
  const isContainer =
    plan.vehicleName.toLowerCase().includes('konteyner') ||
    plan.vehicleName.toLowerCase().includes('ft');

  return (
    <main className="min-h-screen bg-zinc-50">
      {has3D && <ShareAutoLoader detail={planDetail} />}

      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-800">CargoPilot</span>
            <span className="text-zinc-300">·</span>
            <span className="text-sm text-zinc-500">Paylaşılan Yükleme Planı</span>
          </div>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
              statusCfg.className,
            )}
          >
            {statusCfg.label}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{plan.planName}</h1>
          <p className="text-sm text-zinc-500 mt-1">{plan.planCode}</p>
        </div>

        {/* 3D Viewer */}
        {planDetail === undefined ? (
          <Skeleton className="h-[480px] rounded-xl" />
        ) : has3D ? (
          <div className="space-y-2">
            <CameraPresetButtons />
            <div className="relative h-[480px] rounded-xl overflow-hidden border border-zinc-200 bg-white">
              <PlanCanvas readOnly />
              <ShareBoxInfo />
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              Kutulara tıklayarak ürün detaylarını görebilirsiniz.
            </p>
          </div>
        ) : null}

        {/* Stats card */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
              {isContainer ? (
                <Package2 className="w-4 h-4 text-zinc-500" strokeWidth={2} />
              ) : (
                <Truck className="w-4 h-4 text-zinc-500" strokeWidth={2} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">{plan.vehicleName}</p>
              {plan.vehiclePlate && <p className="text-xs text-zinc-400">{plan.vehiclePlate}</p>}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-400">Ürün Sayısı</span>
              <span className="text-sm font-medium text-zinc-600">{plan.productCount} adet</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-400">Toplam Ağırlık</span>
              <span className="text-sm font-medium text-zinc-600">
                {formatWeightDisplay(plan.totalWeightKg, weightUnit)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-400">Araç Kapasitesi</span>
              <span className="text-sm font-medium text-zinc-600">
                {formatWeightDisplay(plan.vehicleCapacityKg, weightUnit)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-400">Doluluk</span>
              <span className="text-sm font-semibold text-zinc-900">%{plan.fillPercentage}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  plan.fillPercentage >= 90
                    ? 'bg-emerald-500'
                    : plan.fillPercentage >= 60
                      ? 'bg-blue-500'
                      : 'bg-zinc-400',
                )}
                style={{ width: `${plan.fillPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400">
          Bu plan yalnızca görüntüleme amaçlıdır. Herhangi bir düzenleme yapılamaz.
        </p>
      </div>
    </main>
  );
}
