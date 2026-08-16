import * as XLSX from 'xlsx';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate, getExcelDateCellValue } from '@/lib/utils/format/formatDate';
import { DoorFace, DoorType, type VehicleDoor } from '@/lib/types/vehicle';

/**
 * Kapı kümesini içe aktarma şablonunun anahtarına çevirir; dışa aktarılan dosya
 * doğrudan geri yüklenebilsin diye `formatDoorSummary` yerine bu kullanılır
 * (o insan okuması için, bu round-trip için).
 */
function doorSetKey(doors: readonly VehicleDoor[] | undefined): string {
  if (!doors || doors.length === 0) return '';

  const arka = doors.some((d) => d.type === DoorType.Small);
  const yan = doors.find((d) => d.type === DoorType.Big);

  if (arka && yan) return yan.face === DoorFace.ZeroX ? 'arka+sol' : 'arka+sağ';
  if (yan) return yan.face === DoorFace.ZeroX ? 'sol' : 'sağ';
  if (arka) return 'arka';
  return '';
}

export function exportVehiclesToExcel(vehicles: Vehicle[], _filters?: VehicleFilters): void {
  const { dateFormat } = useUnitStore.getState();

  const rows = vehicles.map((v) => ({
    'Araç Adı': v.name,
    'Araç Tipi': v.vehicleType,
    // Başlıklar içe aktarma şablonuyla (export-utils.downloadVehicleImportTemplate)
    // birebir aynı: dışa aktarılan dosya doğrudan geri yüklenebilmeli. Ölçüler
    // aracın İÇ ölçüleridir; "Dış" etiketi yanlıştı (S-32).
    'Uzunluk (cm)': v.length,
    'Genişlik (cm)': v.width,
    'Yükseklik (cm)': v.height,
    'Maks Yük (kg)': v.maxCargoWeight,
    'Boş Ağırlık (kg)': v.tareWeight ?? '',
    'Kapılar (arka/arka+sol/arka+sağ/sol/sağ)': doorSetKey(v.doors),
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
