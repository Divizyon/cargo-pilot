import * as XLSX from 'xlsx';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDate, getExcelDateCellValue } from '@/lib/utils/formatDate';

export function exportItemsToExcel(items: Item[]): void {
  const { dateFormat } = useUnitStore.getState();

  const rows = items.map((item) => ({
    SKU: item.sku,
    'Ürün Adı': item.name,
    'Tip (koli/varil/palet)': item.productType,
    'Genişlik(cm)': item.width,
    'Yükseklik(cm)': item.height,
    'Uzunluk(cm)': item.length,
    'Ağırlık(kg)': item.weight,
    'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)':
      item.fragility === 2 ? 2 : item.fragility === 1 ? 1 : 0,
    'İstiflenebilir (true/false)': item.isStackable ? 'true' : 'false',
    'Maks Kat': item.maxStackCount,
    'X Dönüşümü (true/false)': item.allowRotateX ? 'true' : 'false',
    'Y Dönüşümü (true/false)': item.allowRotateY ? 'true' : 'false',
    'Z Dönüşümü (true/false)': item.allowRotateZ ? 'true' : 'false',
    'Özel Notlar': item.specialNotes ?? '',
  }));

  const exportDate = new Date();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');

  const metaWs = XLSX.utils.aoa_to_sheet(
    [['Dışa Aktarma Tarihi', getExcelDateCellValue(exportDate, dateFormat)]],
    { cellDates: true },
  );
  XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

  XLSX.writeFile(wb, `CargoPilot_Urunler_${formatDate(exportDate, dateFormat)}.xlsx`);
}

export function downloadItemImportTemplate(): void {
  const headers = [
    'SKU',
    'Ürün Adı',
    'Tip (koli/varil/palet)',
    'Genişlik(cm)',
    'Yükseklik(cm)',
    'Uzunluk(cm)',
    'Ağırlık(kg)',
    'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)',
    'İstiflenebilir (true/false)',
    'Maks Kat',
    'X Dönüşümü (true/false)',
    'Y Dönüşümü (true/false)',
    'Z Dönüşümü (true/false)',
    'Özel Notlar',
  ];
  const example = [
    'SKU001',
    'Örnek Koli',
    'koli',
    '300',
    '200',
    '100',
    '2.5',
    '0',
    'true',
    '3',
    'true',
    'true',
    'true',
    '',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  XLSX.writeFile(wb, 'CargoPilot_Urun_Import_Sablon.xlsx');
}

export function downloadVehicleImportTemplate(): void {
  const headers = [
    'Araç Tipi (Tır/Kamyon/Kamposet/Konteyner)',
    'Araç Adı',
    'Plaka (Tır/Kamyon/Kamposet için zorunlu)',
    'Seri No (Konteyner için zorunlu)',
    'Uzunluk (cm)',
    'Genişlik (cm)',
    'Yükseklik (cm)',
    'Maks Yük (kg)',
    'Kapı Yönü (rear/side/top/rearAndSide)',
  ];
  const example = ['Tır', 'Ana Dorse', '34ABC123', '', '1360', '240', '270', '26000', 'rear'];

  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
  XLSX.writeFile(wb, 'CargoPilot_Arac_Import_Sablon.xlsx');
}

export function exportPlanToExcel(
  planId: string,
  placements: PlacementWithDimensions[],
  items: Item[],
): void {
  const { dateFormat } = useUnitStore.getState();

  const rows = placements.map((p) => {
    const item = items.find((i) => i.id === p.itemId);
    return {
      'Ürün Adı': item?.name ?? '-',
      SKU: item?.sku ?? '-',
      'Genişlik (cm)': p.width,
      'Yükseklik (cm)': p.height,
      'Derinlik (cm)': p.depth,
      'Konum X': p.positionX,
      'Konum Y': p.positionY,
      'Konum Z': p.positionZ,
      'Kural İhlali': p.isViolation ? 'İhlal' : 'Uygun',
    };
  });

  const exportDate = new Date();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Yükleme Planı');

  const metaWs = XLSX.utils.aoa_to_sheet(
    [['Dışa Aktarma Tarihi', getExcelDateCellValue(exportDate, dateFormat)]],
    { cellDates: true },
  );
  XLSX.utils.book_append_sheet(wb, metaWs, 'Meta');

  XLSX.writeFile(wb, `CargoPilot_Plan_${planId.slice(0, 8)}.xlsx`);
}
