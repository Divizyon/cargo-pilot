import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportVehiclesToExcel } from '@/lib/utils/exportVehiclesToExcel';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';

interface Props {
  vehicles: Vehicle[];
  filters?: VehicleFilters;
  disabled?: boolean;
}

export function VehicleExportButton({ vehicles, filters, disabled }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5 text-xs"
      disabled={disabled || vehicles.length === 0}
      onClick={() => exportVehiclesToExcel(vehicles, filters)}
    >
      <Download className="h-3.5 w-3.5" />
      Excel İndir
    </Button>
  );
}
