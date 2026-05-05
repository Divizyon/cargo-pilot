import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Package2, Plus, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { usePackingOptimize } from '@/lib/api/usePackingOptimize';
import { VehicleType, type Vehicle } from '@/lib/types/vehicle';
import { useVehicles } from '@/lib/api/useVehicles';
import { AddVehicleModal } from './AddVehicleModal';
import { SelectedBoxPanel } from './SelectedBoxPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── VehicleListItem ──────────────────────────────────────────────────────────

interface VehicleListItemProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: (v: Vehicle) => void;
  onDelete: (id: string) => void;
}

function VehicleListItem({ vehicle, isSelected, onSelect, onDelete }: VehicleListItemProps) {
  const isContainer = vehicle.vehicleType === VehicleType.Konteyner;
  const iconClass = cn('w-4 h-4 shrink-0', isSelected ? 'text-white' : 'text-zinc-500');

  return (
    <div
      className={cn(
        'group/item flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors',
        isSelected ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-700',
      )}
    >
      <button
        onClick={() => onSelect(vehicle)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        {isContainer ? (
          <Package2 className={iconClass} strokeWidth={2} />
        ) : (
          <Truck className={iconClass} strokeWidth={2} />
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm truncate', isSelected ? 'text-white' : 'text-zinc-800')}>
            {vehicle.name}
          </p>
          <p
            className={cn(
              'text-[10px] tabular-nums mt-0.5',
              isSelected ? 'text-zinc-300' : 'text-zinc-400',
            )}
          >
            {vehicle.length}×{vehicle.width}×{vehicle.height} cm
            {' · '}
            {((vehicle.payload ?? vehicle.maxCargoWeight) / 1000).toFixed(1)} t
          </p>
        </div>
      </button>
      <button
        onClick={() => onDelete(vehicle.id)}
        title="Sil"
        className={cn(
          'shrink-0 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity',
          isSelected
            ? 'text-zinc-300 hover:text-white hover:bg-white/10'
            : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50',
        )}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── PlanSummaryPanel ─────────────────────────────────────────────────────────

function PlanSummaryPanel() {
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const placements = usePlanStore((s) => s.placements);
  const selectedItems = usePlanStore((s) => s.selectedItems);

  const stats = useMemo(() => {
    if (!selectedVehicle) return null;
    const vehicleVol = selectedVehicle.width * selectedVehicle.height * selectedVehicle.length;
    const weightMap = new Map(selectedItems.map(({ item }) => [item.id, item.weight]));
    const cargoVolCm3 = placements.reduce((s, p) => s + p.width * p.height * p.depth, 0);
    const totalWeight = placements.reduce((s, p) => s + (weightMap.get(p.itemId) ?? 0), 0);
    const volumePct =
      vehicleVol > 0 ? Math.min(100, Math.round((cargoVolCm3 / vehicleVol) * 100)) : 0;
    const remainingM3 = parseFloat(Math.max(0, (vehicleVol - cargoVolCm3) / 1_000_000).toFixed(2));
    return { volumePct, totalWeight, remainingM3, placedCount: placements.length };
  }, [placements, selectedVehicle, selectedItems]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-5">
        <span className="text-xs text-zinc-400">Araç seçilmedi</span>
      </div>
    );
  }

  const rows = [
    { label: 'Hacim doluluk', value: `%${stats.volumePct}` },
    { label: 'Ağırlık', value: `${(stats.totalWeight / 1000).toFixed(2)} t` },
    { label: 'Yerleştirilen kutu', value: `${stats.placedCount} adet` },
    { label: 'Kalan boş hacim', value: `${stats.remainingM3} m³` },
  ];

  return (
    <div className="px-3 py-2 flex flex-col gap-0.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1">
          <span className="text-[10px] text-zinc-400">{r.label}</span>
          <span className="text-xs text-zinc-600">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── PlanRightPanel ───────────────────────────────────────────────────────────

interface PlanRightPanelProps {
  vehiclesOpen?: boolean;
  onToggleVehicles?: () => void;
}

export function PlanRightPanel({ vehiclesOpen = true, onToggleVehicles }: PlanRightPanelProps) {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const setPlacements = usePlanStore((s) => s.setPlacements);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedItems = usePlanStore((s) => s.selectedItems);
  const skuColorMap = usePlanStore((s) => s.skuColorMap);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);

  const { mutate: optimize, isPending: isOptimizing } = usePackingOptimize();

  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const pendingSelectIdRef = useRef<string | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const hasAutoClosedRef = useRef(false);

  useEffect(() => {
    if (!pendingSelectIdRef.current) return;
    const found = vehicles.find((v) => v.id === pendingSelectIdRef.current);
    if (found) {
      setVehicle(found);
      pendingSelectIdRef.current = null;
    }
  }, [vehicles, setVehicle]);

  function handleVehicleCreated(id: string | null) {
    if (id) pendingSelectIdRef.current = id;
  }

  function handleSelectVehicle(v: Vehicle) {
    setVehicle(v);
    if (!hasAutoClosedRef.current) {
      hasAutoClosedRef.current = true;
      onToggleVehicles?.();
    }
  }

  function handleDeleteVehicle(id: string) {
    if (selectedVehicle?.id === id) setVehicle(null);
  }

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ── Kutu 1: Araçlar — wrapper+toggle birlikte kayar, kutu biraz daha ileri gider */}
      <div
        className={cn(
          'relative flex-1 min-h-0',
          'transition-transform duration-[220ms] ease-out',
          !vehiclesOpen && 'translate-x-[calc(100%-0.75rem)]',
        )}
      >
        {/* Toggle butonu — wrapper ile kayar, ekranın sağ kenarına oturur */}
        {onToggleVehicles && (
          <button
            onClick={onToggleVehicles}
            title={vehiclesOpen ? 'Araç listesini kapat' : 'Araç listesini aç'}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 -left-3 z-20',
              'h-6 w-6 flex items-center justify-center rounded-full',
              'border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground',
            )}
          >
            {vehiclesOpen ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        )}

        <div
          className={cn(
            'h-full bg-white rounded-xl border border-zinc-200 overflow-hidden flex flex-col',
            'transition-transform duration-[220ms] ease-out',
            !vehiclesOpen && 'translate-x-6',
          )}
        >
          <div className="px-3 py-2.5 flex items-center justify-between shrink-0 border-b border-zinc-100">
            <span className="text-sm text-zinc-800">Araçlar</span>
            <Button
              size="icon"
              title="Araç Ekle"
              className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
              onClick={() => setShowVehicleModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5">
            {vehiclesLoading ? (
              <div className="flex items-center justify-center py-8 text-zinc-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Araçlar yükleniyor…
              </div>
            ) : vehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Truck className="w-8 h-8 text-zinc-200" />
                <p className="text-xs text-zinc-400">Henüz araç eklenmemiş</p>
              </div>
            ) : (
              vehicles.map((v) => (
                <VehicleListItem
                  key={v.id}
                  vehicle={v}
                  isSelected={selectedVehicle?.id === v.id}
                  onSelect={handleSelectVehicle}
                  onDelete={handleDeleteVehicle}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Kutu 2: Plan Özeti + aksiyonlar ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shrink-0 flex flex-col">
        <div className="px-3 py-2.5 border-b border-zinc-100 shrink-0">
          <span className="text-sm text-zinc-800">Plan Özeti</span>
        </div>

        <PlanSummaryPanel />

        {/* Seçili kutu bilgileri */}
        {selectedInstanceId !== null && (
          <div className="border-t border-zinc-100 overflow-y-auto shrink-0 max-h-[220px]">
            <SelectedBoxPanel />
          </div>
        )}

        <div className="px-3 py-3 border-t border-zinc-100 shrink-0">
          <Button
            className="w-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
            disabled={!selectedVehicle || selectedItems.length === 0 || isOptimizing}
            onClick={() => {
              if (!selectedVehicle) return;
              optimize(
                { vehicle: selectedVehicle, items: selectedItems, skuColorMap },
                { onSuccess: (placements) => setPlacements(placements) },
              );
            }}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Optimizasyon…
              </>
            ) : (
              'Optimizasyonu Başlat'
            )}
          </Button>
        </div>
      </div>

      <AddVehicleModal
        open={showVehicleModal}
        onOpenChange={setShowVehicleModal}
        onCreated={handleVehicleCreated}
      />
    </div>
  );
}
