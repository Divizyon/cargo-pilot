import * as XLSX from 'xlsx';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate, getExcelDateCellValue } from '@/lib/utils/formatDate';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

export function exportVehiclesToExcel(vehicles: Vehicle[], _filters?: VehicleFilters): void {
  const { dateFormat } = useUnitStore.getState();

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

  const exportDate = new Date();
  const metaWs = XLSX.utils.aoa_to_sheet(
    [['Dışa Aktarma Tarihi', getExcelDateCellValue(exportDate, dateFormat)]],
    { cellDates: true },
  );
  XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

  const fileName = `CargoPilot_Arac_Envanteri_${formatDate(exportDate, dateFormat)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
