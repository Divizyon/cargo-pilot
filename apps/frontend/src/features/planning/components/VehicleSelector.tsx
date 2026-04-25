import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import type { Vehicle } from '@/lib/types/vehicle';

export const STANDARD_VEHICLES: Vehicle[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: '20ft Konteyner',
    width: 235,
    height: 239,
    length: 590,
    payload: 28000,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: '40ft Konteyner',
    width: 235,
    height: 239,
    length: 1203,
    payload: 26700,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Tır (Yarı Römork)',
    width: 248,
    height: 270,
    length: 1360,
    payload: 24000,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Kamyon',
    width: 240,
    height: 240,
    length: 800,
    payload: 15000,
  },
];

interface VehicleSelectorProps {
  className?: string;
}

export function VehicleSelector({ className }: VehicleSelectorProps = {}) {
  const setVehicle = usePlanStore((s) => s.setVehicle);
  const selectedVehicle = usePlanStore((s) => s.selectedVehicle);

  function handleValueChange(id: string) {
    const vehicle = STANDARD_VEHICLES.find((v) => v.id === id);
    if (vehicle) setVehicle(vehicle);
  }

  return (
    <Select value={selectedVehicle?.id ?? ''} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('w-56', className)}>
        <SelectValue placeholder="Araç tipi seçin" />
      </SelectTrigger>
      <SelectContent>
        {STANDARD_VEHICLES.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
