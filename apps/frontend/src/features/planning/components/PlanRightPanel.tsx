import { Box, Package2, Truck } from 'lucide-react';
import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import type { Vehicle } from '@/lib/types/vehicle';
import { STANDARD_VEHICLES, VehicleSelector } from './VehicleSelector';

// ─── Vehicle card metadata ────────────────────────────────────────────────────

const CARD_META: Record<string, { icon: ElementType; label: string }> = {
  '00000000-0000-0000-0000-000000000001': { icon: Package2, label: '20ft\nKont.' },
  '00000000-0000-0000-0000-000000000002': { icon: Package2, label: '40ft\nKont.' },
  '00000000-0000-0000-0000-000000000003': { icon: Truck, label: 'Tır' },
  '00000000-0000-0000-0000-000000000004': { icon: Truck, label: 'Kamyon' },
};

// ─── VehicleTypeCard ──────────────────────────────────────────────────────────

interface VehicleTypeCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onSelect: (v: Vehicle) => void;
}

function VehicleTypeCard({ vehicle, isSelected, onSelect }: VehicleTypeCardProps) {
  const meta = CARD_META[vehicle.id];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border transition-colors text-center',
        isSelected
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-200 hover:border-zinc-400 text-zinc-500 hover:text-zinc-700',
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10px] leading-tight font-medium whitespace-pre-line">{meta.label}</span>
    </button>
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

export function PlanRightPanel() {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  return (
    <div className="h-full bg-white border border-zinc-200 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 shrink-0 border-b border-zinc-100">
        <span className="text-sm text-zinc-800">Araç Seçimi</span>
      </div>

      {/* Vehicle type cards */}
      <div className="px-3 pt-3 pb-2 grid grid-cols-2 gap-2 shrink-0">
        {STANDARD_VEHICLES.map((v) => (
          <VehicleTypeCard
            key={v.id}
            vehicle={v}
            isSelected={selectedVehicle?.id === v.id}
            onSelect={setVehicle}
          />
        ))}
      </div>

      {/* Dropdown */}
      <div className="px-3 pb-3 shrink-0">
        <VehicleSelector className="w-full" />
      </div>

      <div className="border-t border-zinc-100 shrink-0" />

      {/* Vehicle details — fills remaining space */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {selectedVehicle ? (
          <VehicleDetails vehicle={selectedVehicle} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Box className="w-8 h-8 text-zinc-200" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Yükleme alanını görmek için
              <br />
              bir araç seçin
            </p>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-3 py-3 border-t border-zinc-100 shrink-0">
        <Button
          className="w-full bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40"
          disabled={!selectedVehicle}
        >
          Optimizasyonu Başlat
        </Button>
      </div>
    </div>
  );
}
