import { useMemo } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Package2, Truck } from 'lucide-react';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatWeightDisplay } from '@/lib/utils/unitConversion';
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
  const iconClass = type === 'Konteyner' ? 'text-sky-500' : 'text-muted-foreground';
  const volumeM3 = cm3ToM3(vehicleVolumeCm3(vehicle)).toFixed(1);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <div className="bg-background border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
          <Icon className={cn('w-3.5 h-3.5', iconClass)} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{vehicle.name}</p>
          <p className="text-[10px] text-muted-foreground">{type}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Uzunluk', value: `${vehicle.length} cm` },
            { label: 'Genişlik', value: `${vehicle.width} cm` },
            { label: 'Yükseklik', value: `${vehicle.height} cm` },
          ].map((r) => (
            <div key={r.label} className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="text-xs text-foreground">{r.value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'İç Hacim', value: `${volumeM3} m³` },
            {
              label: 'Max Yük',
              value: formatWeightDisplay(vehicle.payload ?? vehicle.maxCargoWeight, weightUnit),
            },
          ].map((r) => (
            <div key={r.label} className="bg-muted/40 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-muted-foreground">{r.label}</p>
              <p className="text-xs text-foreground">{r.value}</p>
            </div>
          ))}
        </div>
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
  const weightUnit = useUnitStore((s) => s.weightUnit);
  return (
    <div className="bg-background border border-border rounded-xl p-3">
      <p className="text-[10px] text-muted-foreground mb-2">İstatistikler</p>

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">Hacim</span>
        <span className="text-xs text-foreground">%{volumePct}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            volumePct > 85 ? 'bg-rose-500' : 'bg-foreground/80',
          )}
          style={{ width: `${volumePct}%` }}
        />
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">
          Ağırlık · {formatWeightDisplay(weightKg, weightUnit)}
        </span>
        <span className="text-xs text-foreground">%{weightPct}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            weightPct > 90 ? 'bg-rose-500' : 'bg-muted/400',
          )}
          style={{ width: `${weightPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-border">
        <span className="text-[10px] text-muted-foreground">Kalan Boş Hacim</span>
        <span className="text-xs text-muted-foreground">{remainingM3} m³</span>
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
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const statusOk = volumePct <= 100;
  return (
    <div className="bg-background border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-muted-foreground">Plan Özeti</p>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border',
            statusOk
              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
              : 'text-rose-600 bg-rose-50 border-rose-200',
          )}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          {statusOk ? 'Normal' : 'Kapasite Aşıldı'}
        </span>
      </div>
      <div className="flex flex-col">
        {[
          { label: 'Yerleştirilen kutu', value: `${placedCount} adet` },
          { label: 'Toplam ağırlık', value: formatWeightDisplay(totalWeight, weightUnit) },
          { label: 'Kalan boş alan', value: `${remainingM3} m³` },
          { label: 'Doluluk oranı', value: `%${volumePct}` },
        ].map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-1 border-b border-border last:border-0"
          >
            <span className="text-[10px] text-muted-foreground">{r.label}</span>
            <span className="text-xs text-muted-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── StatsPanel ────────────────────────────────────────────────────────────────

interface StatsPanelProps {
  compact?: boolean;
  alwaysShowCards?: boolean;
}

export function StatsPanel({ compact = false, alwaysShowCards = false }: StatsPanelProps) {
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

  if (!selectedVehicle || !stats) {
    if (alwaysShowCards) return null;
    return (
      <div className="bg-background/90 backdrop-blur border border-border rounded-xl px-4 h-11 flex items-center">
        <span className="text-xs text-muted-foreground">İstatistikler için bir araç seçin</span>
      </div>
    );
  }

  if (alwaysShowCards) {
    return (
      <div className="grid grid-cols-3 gap-3">
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
    );
  }

  const type = vehicleType(selectedVehicle.name);
  const VehicleIcon = type === 'Konteyner' ? Package2 : Truck;

  return (
    <div>
      {/* Şerit */}
      <div className="bg-background border border-border rounded-xl px-3 h-11 flex items-center gap-3">
        <div className="w-7 h-7 flex items-center justify-center shrink-0">
          {compact ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <div className="w-px h-4 bg-muted shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <VehicleIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {selectedVehicle.name}
          </span>
        </div>

        <div className="w-px h-4 bg-muted shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Hacim</span>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                stats.volumePct > 85 ? 'bg-rose-500' : 'bg-foreground/80',
              )}
              style={{ width: `${stats.volumePct}%` }}
            />
          </div>
          <span className="text-xs text-foreground">%{stats.volumePct}</span>
        </div>

        <div className="w-px h-4 bg-muted shrink-0" />

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Ağırlık</span>
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                stats.weightPct > 90 ? 'bg-rose-500' : 'bg-muted/400',
              )}
              style={{ width: `${stats.weightPct}%` }}
            />
          </div>
          <span className="text-xs text-foreground">%{stats.weightPct}</span>
        </div>

        <div className="w-px h-4 bg-muted shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">Kalan</span>
          <span className="text-xs text-foreground">{stats.remainingM3} m³</span>
        </div>
      </div>

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
