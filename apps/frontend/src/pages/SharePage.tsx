import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Clock, Package2, Truck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useShareByToken, useRecordShareView } from '@/lib/api/useShareLinks';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
import type { AxiosError } from 'axios';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  tamamlandi: {
    label: 'Tamamlandı',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  aktif: { label: 'Aktif', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  taslak: { label: 'Taslak', className: 'bg-zinc-50 text-zinc-600 border-zinc-200' },
  iptal: { label: 'İptal', className: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { data: plan, isLoading, isError, error } = useShareByToken(token ?? '');
  const { mutate: recordView } = useRecordShareView();
  const weightUnit = useUnitStore((s) => s.weightUnit);

  useEffect(() => {
    if (token) recordView(token);
  }, [token, recordView]);

  const is404 = (error as AxiosError | null)?.response?.status === 404;

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

  const fillPct = Math.round(plan.fillPercentage * 100 * 100) / 100;
  const statusCfg = STATUS_CONFIG[plan.status] ?? STATUS_CONFIG['taslak'];
  const isContainer =
    plan.vehicleName.toLowerCase().includes('konteyner') ||
    plan.vehicleName.toLowerCase().includes('ft');

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
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

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{plan.planName}</h1>
          <p className="text-sm text-zinc-500 mt-1">{plan.planCode}</p>
        </div>

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
              <span className="text-sm font-semibold text-zinc-900">%{fillPct}</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  fillPct >= 90 ? 'bg-emerald-500' : fillPct >= 60 ? 'bg-blue-500' : 'bg-zinc-400',
                )}
                style={{ width: `${Math.min(fillPct, 100)}%` }}
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
