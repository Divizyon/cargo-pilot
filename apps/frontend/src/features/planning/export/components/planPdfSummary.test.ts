import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { buildPdfSummaryRows, sumPlacementWeight } from './planPdfSummary';

const ITEMS = [
  { id: 'a', name: 'Koli A', weight: 5 },
  { id: 'b', name: 'Koli B', weight: 12.5 },
] as Item[];

function box(itemId: string, overrides: Partial<PlacementWithDimensions> = {}) {
  return {
    itemId,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    orientationIndex: 0,
    layer: 1,
    isViolation: false,
    width: 40,
    height: 30,
    length: 20,
    weight: 0,
    ...overrides,
  } as PlacementWithDimensions;
}

describe('buildPdfSummaryRows', () => {
  it('grup ağırlığı toplam ağırlıktır, birim değil', () => {
    // Denetim S-08: satır 5 kg × 10 adet için 500 kg gösteriyordu.
    const rows = buildPdfSummaryRows(
      Array.from({ length: 10 }, () => box('a')),
      ITEMS,
    );

    expect(rows.get('a')).toMatchObject({ count: 10, weight: 50 });
  });

  /** Asıl değişmez: yükleme listesi toplamı plan özetiyle çelişemez. */
  it('satır toplamları plan özetindeki toplam ağırlığa eşit', () => {
    const placements = [...Array.from({ length: 10 }, () => box('a')), box('b'), box('b')];

    const rows = buildPdfSummaryRows(placements, ITEMS);
    const satirToplami = [...rows.values()].reduce((sum, r) => sum + r.weight, 0);

    expect(satirToplami).toBe(sumPlacementWeight(placements, ITEMS));
    expect(satirToplami).toBe(75);
  });

  it('tek adette de doğru — hatanın gizlendiği durum', () => {
    const rows = buildPdfSummaryRows([box('a')], ITEMS);
    expect(rows.get('a')?.weight).toBe(5);
  });

  it('ihlalleri ayrı sayar', () => {
    const rows = buildPdfSummaryRows(
      [box('a'), box('a', { isViolation: true }), box('a', { isViolation: true })],
      ITEMS,
    );
    expect(rows.get('a')).toMatchObject({ count: 3, violations: 2 });
  });

  it('katalogda olmayan ürünü sıfır ağırlıkla geçer, düşürmez', () => {
    const rows = buildPdfSummaryRows([box('bilinmeyen')], ITEMS);
    expect(rows.get('bilinmeyen')).toMatchObject({ name: '-', count: 1, weight: 0 });
  });
});
