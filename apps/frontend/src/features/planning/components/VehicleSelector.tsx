import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { STANDARD_VEHICLES } from '@/lib/config/vehicles';

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
