import { useMemo } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Package2, Truck } from 'lucide-react';
import { usePlanStore } from '@/lib/store/usePlanStore';
import type { Vehicle } from '@/lib/types/vehicle';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vehicleType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('konteyner')) return 'Konteyner';
  if (n.includes('tır') || n.includes('römork')) return 'Tır';
  return 'Kamyon';
}

function vehicleVolumeCm3(v: Vehicle): number {
  return v.width * v.height * v.length;
}

function cm3ToM3(cm3: number): number {
  return cm3 / 1_000_000;
}

// ─── Full cards ────────────────────────────────────────────────────────────────

function VehicleInfoCard({ vehicle }: { vehicle: Vehicle }) {
  const type = vehicleType(vehicle.name);
  const Icon = type === 'Konteyner' ? Package2 : Truck;
  const iconClass = type === 'Konteyner' ? 'text-sky-500' : 'text-zinc-600';
  const volumeM3 = cm3ToM3(vehicleVolumeCm3(vehicle)).toFixed(1);
  const payloadTon = ((vehicle.payload ?? vehicle.maxCargoWeight) / 1000).toFixed(1);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-3">Araç Bilgisi</p>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          <Icon className={cn('w-4 h-4', iconClass)} strokeWidth={2} />
        </div>
        <div>
          <p className="text-sm text-zinc-800">{vehicle.name}</p>
          <p className="text-xs text-zinc-400">{type}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Uzunluk', value: `${vehicle.length} cm` },
          { label: 'Genişlik', value: `${vehicle.width} cm` },
          { label: 'Yükseklik', value: `${vehicle.height} cm` },
          { label: 'İç Hacim', value: `${volumeM3} m³` },
          { label: 'Max Yük', value: `${payloadTon} t` },
        ].map((r) => (
          <div key={r.label} className="bg-zinc-50 rounded-lg px-2.5 py-2">
            <p className="text-xs text-zinc-400 mb-0.5">{r.label}</p>
            <p className="text-sm text-zinc-700">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatisticsCard({
  volumePct,
  weightKg,
  weightPct,
  remainingM3,
}: {
  volumePct: number;
  weightKg: number;
  weightPct: number;
  remainingM3: number;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-3">İstatistikler</p>

      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs text-zinc-500">Hacim Kullanımı</span>
        <span className="text-sm text-zinc-800">%{volumePct}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            volumePct > 85 ? 'bg-rose-500' : 'bg-zinc-700',
          )}
          style={{ width: `${volumePct}%` }}
        />
      </div>

      <div className="flex items-end justify-between mb-1.5">
        <span className="text-xs text-zinc-500">Ağırlık · {(weightKg / 1000).toFixed(2)} t</span>
        <span className="text-sm text-zinc-800">%{weightPct}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            weightPct > 90 ? 'bg-rose-500' : 'bg-zinc-500',
          )}
          style={{ width: `${weightPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between py-1 border-t border-zinc-100 mt-1">
        <span className="text-xs text-zinc-400">Kalan Boş Hacim</span>
        <span className="text-sm text-zinc-600">{remainingM3} m³</span>
      </div>
    </div>
  );
}

function SummaryCard({
  placedCount,
  totalWeight,
  remainingM3,
  volumePct,
}: {
  placedCount: number;
  totalWeight: number;
  remainingM3: number;
  volumePct: number;
}) {
  const statusOk = volumePct <= 100;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500">Plan Özeti</p>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border',
            statusOk
              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
              : 'text-rose-600 bg-rose-50 border-rose-200',
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          {statusOk ? 'Normal' : 'Kapasite Aşıldı'}
        </span>
      </div>
      <div className="flex flex-col gap-0">
        {[
          { label: 'Yerleştirilen kutu', value: `${placedCount} adet` },
          { label: 'Toplam yük ağırlığı', value: `${(totalWeight / 1000).toFixed(2)} t` },
          { label: 'Kalan boş alan', value: `${remainingM3} m³` },
          { label: 'Doluluk oranı', value: `%${volumePct}` },
        ].map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0"
          >
            <span className="text-xs text-zinc-400">{r.label}</span>
            <span className="text-sm text-zinc-600">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── StatsPanel ────────────────────────────────────────────────────────────────

interface StatsPanelProps {
  compact?: boolean;
}

export function StatsPanel({ compact = false }: StatsPanelProps) {
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  const weightMap = useMemo(() => {
    const map = new Map<string, number>();
    selectedItems.forEach(({ item }) => map.set(item.id, item.weight));
    return map;
  }, [selectedItems]);

  const stats = useMemo(() => {
    if (!selectedVehicle) return null;
    const vehicleVol = vehicleVolumeCm3(selectedVehicle);
    const cargoVolCm3 = placements.reduce((sum, p) => sum + p.width * p.height * p.depth, 0);
    const totalWeight = placements.reduce((sum, p) => sum + (weightMap.get(p.itemId) ?? 0), 0);
    const volumePct =
      vehicleVol > 0 ? Math.min(100, Math.round((cargoVolCm3 / vehicleVol) * 100)) : 0;
    const effectivePayload = selectedVehicle.payload ?? selectedVehicle.maxCargoWeight;
    const weightPct =
      effectivePayload > 0 ? Math.min(100, Math.round((totalWeight / effectivePayload) * 100)) : 0;
    const remainingM3 = parseFloat(Math.max(0, cm3ToM3(vehicleVol - cargoVolCm3)).toFixed(2));
    return { volumePct, weightPct, totalWeight, remainingM3 };
  }, [placements, selectedVehicle, weightMap]);

  // Araç seçilmemişse boş placeholder şerit — her zaman görünür
  if (!selectedVehicle || !stats) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl px-4 h-11 flex items-center">
        <span className="text-xs text-zinc-400">İstatistikler için bir araç seçin</span>
      </div>
    );
  }

  const type = vehicleType(selectedVehicle.name);
  const VehicleIcon = type === 'Konteyner' ? Package2 : Truck;

  return (
    <div>
      {/* Şerit — her zaman görünür, ok ibaresi görsel gösterge */}
      <div className="bg-white border border-zinc-200 rounded-xl px-3 h-11 flex items-center gap-3">
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          {compact ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <VehicleIcon className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
          <span className="text-xs text-zinc-600 truncate max-w-[120px]">
            {selectedVehicle.name}
          </span>
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400">Hacim</span>
          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                stats.volumePct > 85 ? 'bg-rose-500' : 'bg-zinc-700',
              )}
              style={{ width: `${stats.volumePct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-700">%{stats.volumePct}</span>
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-400">Ağırlık</span>
          <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                stats.weightPct > 90 ? 'bg-rose-500' : 'bg-zinc-500',
              )}
              style={{ width: `${stats.weightPct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-700">%{stats.weightPct}</span>
        </div>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-zinc-400">Kalan</span>
          <span className="text-xs text-zinc-700">{stats.remainingM3} m³</span>
        </div>
      </div>

      {/* Kartlar — sadece expanded modda, şeridin altında */}
      {!compact && (
        <div className="grid grid-cols-3 gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
          <VehicleInfoCard vehicle={selectedVehicle} />
          <StatisticsCard
            volumePct={stats.volumePct}
            weightKg={stats.totalWeight}
            weightPct={stats.weightPct}
            remainingM3={stats.remainingM3}
          />
          <SummaryCard
            placedCount={placements.length}
            totalWeight={stats.totalWeight}
            remainingM3={stats.remainingM3}
            volumePct={stats.volumePct}
          />
        </div>
      )}
    </div>
  );
}
