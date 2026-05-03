import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

export function exportVehiclesToExcel(vehicles: Vehicle[], _filters?: VehicleFilters): void {
  const rows = vehicles.map((v) => ({
    'Araç Adı': v.name,
    'Araç Tipi': v.vehicleType,
    'Dış Uzunluk (cm)': v.length,
    'Dış Genişlik (cm)': v.width,
    'Dış Yükseklik (cm)': v.height,
    'Maks Kapasite (kg)': v.maxCargoWeight,
    'Boş Ağırlık (kg)': v.tareWeight ?? '',
    'Kapı Yönü': DOOR_LABELS[v.doorDirection] ?? v.doorDirection,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Araçlar');
  const fileName = `CargoPilot_Arac_Envanteri_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
