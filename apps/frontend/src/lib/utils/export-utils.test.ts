import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { buildPlacementExportRows, buildPlanSummary } from './export-utils';

const mockItem = (overrides?: Partial<Item>): Item => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Ornek Kutu',
  sku: 'BOX-001',
  width: 30,
  height: 20,
  length: 40,
  weight: 5,
  isStackable: true,
  maxStackCount: 3,
  ...overrides,
});

const mockPlacement = (overrides?: Partial<PlacementWithDimensions>): PlacementWithDimensions => ({
  itemId: '11111111-1111-1111-1111-111111111111',
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotation: 0,
  layer: 1,
  isViolation: false,
  width: 30,
  height: 20,
  depth: 40,
  ...overrides,
});

describe('buildPlacementExportRows', () => {
  it('yerleşimleri ürün adı ve SKU ile eşler', () => {
    const items = [mockItem({ id: 'a', name: 'Kutu A', sku: 'A-1' })];
    const placements = [mockPlacement({ itemId: 'a' })];

    const rows = buildPlacementExportRows(placements, items);

    expect(rows).toHaveLength(1);
    expect(rows[0].productName).toBe('Kutu A');
    expect(rows[0].sku).toBe('A-1');
  });

  it('bilinmeyen itemId için "-" yazar', () => {
    const rows = buildPlacementExportRows([mockPlacement({ itemId: 'missing' })], []);
    expect(rows[0].productName).toBe('-');
    expect(rows[0].sku).toBe('-');
  });

  it('isViolation true ise "Kural İhlali" yazar', () => {
    const rows = buildPlacementExportRows([mockPlacement({ isViolation: true })], [mockItem()]);
    expect(rows[0].violation).toBe('Kural İhlali');
  });

  it('isViolation false ise "Uygun" yazar', () => {
    const rows = buildPlacementExportRows([mockPlacement()], [mockItem()]);
    expect(rows[0].violation).toBe('Uygun');
  });

  it('konum ve boyutları aynen yansıtır', () => {
    const rows = buildPlacementExportRows(
      [mockPlacement({ positionX: 10, positionY: 20, positionZ: 30, rotation: 90 })],
      [mockItem()],
    );
    expect(rows[0]).toMatchObject({
      width: 30,
      height: 20,
      length: 40,
      positionX: 10,
      positionY: 20,
      positionZ: 30,
      rotation: 90,
    });
  });
});

describe('buildPlanSummary', () => {
  it('toplam ağırlık ve adet hesaplar', () => {
    const items = [mockItem({ id: 'a', weight: 3 }), mockItem({ id: 'b', weight: 7 })];
    const placements = [mockPlacement({ itemId: 'a' }), mockPlacement({ itemId: 'b' })];

    const summary = buildPlanSummary(placements, items, 1_000_000);

    expect(summary.totalWeightKg).toBe(10);
    expect(summary.totalItemCount).toBe(2);
  });

  it('doluluk oranını yerleşim hacmi / araç hacmi olarak hesaplar', () => {
    const placements = [mockPlacement({ width: 100, height: 100, depth: 100 })];
    const summary = buildPlanSummary(placements, [mockItem()], 2_000_000);
    expect(summary.fillRatePercent).toBe(50);
  });

  it('araç hacmi 0 ise doluluk 0 döner', () => {
    const summary = buildPlanSummary([mockPlacement()], [mockItem()], 0);
    expect(summary.fillRatePercent).toBe(0);
  });

  it('kural ihlali sayısını toplar', () => {
    const placements = [
      mockPlacement({ isViolation: true }),
      mockPlacement({ isViolation: false }),
      mockPlacement({ isViolation: true }),
    ];
    const summary = buildPlanSummary(placements, [mockItem()], 1_000_000);
    expect(summary.violationCount).toBe(2);
  });
});
