import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

export interface PdfSummaryRow {
  name: string;
  count: number;
  /** Gruptaki tüm kutuların TOPLAM ağırlığı (kg) — birim ağırlık değil. */
  weight: number;
  violations: number;
  dims: string;
}

/**
 * Yükleme listesi satırları.
 *
 * `weight` grubun toplamıdır. Bu ayrım kritik: render tarafında bir kez daha
 * `count` ile çarpılınca sonuç `N²·w` oluyordu — 5 kg'lık üründen 10 adet için
 * satırda 500 kg yazıyor, plan özetindeki 50 kg ile çelişiyordu (denetim S-08).
 * Tek adetli üründe hata görünmediği için uzun süre fark edilmedi.
 */
export function buildPdfSummaryRows(
  placements: readonly PlacementWithDimensions[],
  items: readonly Item[],
): Map<string, PdfSummaryRow> {
  const weightByItemId = new Map(items.map((item) => [item.id, item.weight ?? 0]));

  return placements.reduce<Map<string, PdfSummaryRow>>((acc, p) => {
    const weight = weightByItemId.get(p.itemId) ?? 0;
    const existing = acc.get(p.itemId);

    if (existing) {
      existing.count += 1;
      existing.weight += weight;
      if (p.isViolation) existing.violations += 1;
      return acc;
    }

    acc.set(p.itemId, {
      name: items.find((i) => i.id === p.itemId)?.name ?? '-',
      count: 1,
      weight,
      violations: p.isViolation ? 1 : 0,
      dims: `${p.width}×${p.height}×${p.length}`,
    });
    return acc;
  }, new Map());
}

/** Plan özetindeki toplam ağırlık; satır toplamlarıyla eşit olmak zorunda. */
export function sumPlacementWeight(
  placements: readonly PlacementWithDimensions[],
  items: readonly Item[],
): number {
  const weightByItemId = new Map(items.map((item) => [item.id, item.weight ?? 0]));
  return placements.reduce((sum, p) => sum + (weightByItemId.get(p.itemId) ?? 0), 0);
}
