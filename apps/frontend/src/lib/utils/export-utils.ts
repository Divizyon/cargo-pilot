import * as XLSX from 'xlsx';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';

export function exportPlanToExcel(
  planId: string,
  placements: PlacementWithDimensions[],
  items: Item[],
): void {
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

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Yükleme Planı');
  XLSX.writeFile(wb, `CargoPilot_Plan_${planId.slice(0, 8)}.xlsx`);
}
