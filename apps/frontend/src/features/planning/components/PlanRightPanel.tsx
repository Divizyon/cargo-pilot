import { useState } from 'react';
import { Box, ChevronRight, Package2, Plus, Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import type { Vehicle } from '@/lib/types/vehicle';
import { STANDARD_VEHICLES } from '@/lib/config/vehicles';
import { AddVehicleModal } from './AddVehicleModal';
import { SelectedBoxPanel } from './SelectedBoxPanel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveTypeBadge(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('konteyner')) return 'Konteyner';
  if (n.includes('tır') || n.includes('römork')) return 'Tır';
  return 'Kamyon';
}

// ─── VehicleListItem ──────────────────────────────────────────────────────────

interface VehicleListItemProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: (v: Vehicle) => void;
  onDelete: (id: string) => void;
}

function VehicleListItem({ vehicle, isSelected, onSelect, onDelete }: VehicleListItemProps) {
  const isContainer = vehicle.name.toLowerCase().includes('konteyner');
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
          <p className={cn('text-xs', isSelected ? 'text-zinc-300' : 'text-zinc-400')}>
            {resolveTypeBadge(vehicle.name)}
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

// ─── VehicleSpec row ──────────────────────────────────────────────────────────

function VehicleSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs font-medium text-zinc-800">{value}</span>
    </div>
  );
}

// ─── VehicleDetails ───────────────────────────────────────────────────────────

function VehicleDetails({ vehicle }: { vehicle: Vehicle }) {
  const volumeM3 = ((vehicle.width * vehicle.height * vehicle.length) / 1_000_000).toFixed(1);
  const payloadTon = (vehicle.payload / 1000).toFixed(1);

  return (
    <div>
      <p className="text-xs font-semibold text-zinc-700 mb-3">{vehicle.name}</p>
      <VehicleSpec label="Uzunluk" value={`${vehicle.length} cm`} />
      <VehicleSpec label="Genişlik" value={`${vehicle.width} cm`} />
      <VehicleSpec label="Yükseklik" value={`${vehicle.height} cm`} />
      <VehicleSpec label="Maks. Yük" value={`${payloadTon} ton`} />
      <VehicleSpec label="İç Hacim" value={`${volumeM3} m³`} />
    </div>
  );
}

// ─── PlanRightPanel ───────────────────────────────────────────────────────────

interface PlanRightPanelProps {
  onClose?: () => void;
}

export function PlanRightPanel({ onClose }: PlanRightPanelProps) {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);
  const selectedInstanceId = useSceneStore((s) => s.selectedInstanceId);

  const [vehicles, setVehicles] = useState<Vehicle[]>(STANDARD_VEHICLES);
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  function handleAddVehicle(v: Vehicle) {
    setVehicles((prev) => [...prev, v]);
    setVehicle(v);
  }

  function handleDeleteVehicle(id: string) {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    if (selectedVehicle?.id === id) setVehicle(null);
  }

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="text-sm text-zinc-800">Araçlar</span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            title="Araç Ekle"
            className="h-7 w-7 bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => setShowVehicleModal(true)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          {onClose && (
            <button
              title="Kapat"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Vehicle list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {vehicles.map((v) => (
          <VehicleListItem
            key={v.id}
            vehicle={v}
            isSelected={selectedVehicle?.id === v.id}
            onSelect={setVehicle}
            onDelete={handleDeleteVehicle}
          />
        ))}
      </div>

      <div className="border-t border-zinc-100 shrink-0" />

      {/* Selected box panel önceliklenir; yoksa vehicle details. */}
      {selectedInstanceId !== null ? (
        <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
          <SelectedBoxPanel />
        </div>
      ) : (
        <div className="overflow-y-auto px-3 py-3" style={{ maxHeight: 200 }}>
          {selectedVehicle ? (
            <VehicleDetails vehicle={selectedVehicle} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center py-4">
              <Box className="w-8 h-8 text-zinc-200" />
              <p className="text-xs text-zinc-400 leading-relaxed">
                Yükleme alanını görmek için
                <br />
                bir araç seçin
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom action */}
      <div className="px-3 py-3 border-t border-zinc-100 shrink-0">
        <Button
          className="w-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
          disabled={!selectedVehicle}
        >
          Optimizasyonu Başlat
        </Button>
      </div>

      <AddVehicleModal
        open={showVehicleModal}
        onOpenChange={setShowVehicleModal}
        onAdd={handleAddVehicle}
      />
    </div>
  );
}
