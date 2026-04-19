import * as XLSX from 'xlsx';
import type { Item } from '@/lib/types/item';
import type { LoadingPlan, PlacementWithDimensions } from '@/lib/types/loadingPlan';

export interface PlacementExportRow {
  productName: string;
  sku: string;
  width: number;
  height: number;
  length: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotation: number;
  violation: string;
}

const UNKNOWN = '-';

export function buildPlacementExportRows(
  placements: PlacementWithDimensions[],
  items: Item[],
): PlacementExportRow[] {
  const itemIndex = new Map(items.map((i) => [i.id, i]));
  return placements.map((p) => {
    const item = itemIndex.get(p.itemId);
    return {
      productName: item?.name ?? UNKNOWN,
      sku: item?.sku ?? UNKNOWN,
      width: p.width,
      height: p.height,
      length: p.depth,
      positionX: p.positionX,
      positionY: p.positionY,
      positionZ: p.positionZ,
      rotation: p.rotation,
      violation: p.isViolation ? 'Kural İhlali' : 'Uygun',
    };
  });
}

export function exportPlanToExcel(
  plan: LoadingPlan,
  placements: PlacementWithDimensions[],
  items: Item[],
  filename?: string,
): void {
  const rows = buildPlacementExportRows(placements, items);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Yükleme Planı');
  const finalName = filename ?? `cargo-pilot-plan-${plan.id.slice(0, 8)}.xlsx`;
  XLSX.writeFile(book, finalName);
}

export interface PlanSummary {
  totalWeightKg: number;
  totalItemCount: number;
  fillRatePercent: number;
  violationCount: number;
}

export function buildPlanSummary(
  placements: PlacementWithDimensions[],
  items: Item[],
  vehicleVolume: number,
): PlanSummary {
  const itemIndex = new Map(items.map((i) => [i.id, i]));
  let totalWeight = 0;
  let placedVolume = 0;
  let violations = 0;
  for (const p of placements) {
    placedVolume += p.width * p.height * p.depth;
    if (p.isViolation) violations++;
    const item = itemIndex.get(p.itemId);
    if (item) totalWeight += item.weight;
  }
  const fillRate = vehicleVolume > 0 ? (placedVolume / vehicleVolume) * 100 : 0;
  return {
    totalWeightKg: Math.round(totalWeight * 100) / 100,
    totalItemCount: placements.length,
    fillRatePercent: Math.round(fillRate * 100) / 100,
    violationCount: violations,
  };
}

export function captureSceneSnapshot(canvas?: HTMLCanvasElement): string | null {
  const target = canvas ?? document.querySelector<HTMLCanvasElement>('canvas');
  if (!target) return null;
  try {
    return target.toDataURL('image/png');
  } catch {
    return null;
  }
}
