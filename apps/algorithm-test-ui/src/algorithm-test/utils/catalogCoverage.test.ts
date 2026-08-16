import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import { buildCatalogCoverage, isConstrainedItem, toCoverageCounts } from './catalogCoverage';

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'Koli',
    sku: 'KOLI',
    width: 50,
    height: 50,
    length: 50,
    weight: 10,
    isStackable: true,
    maxStackCount: 0,
    maxWeightOnTop: null,
    fragility: 0,
    allowedRotations: 0,
    stackGroup: null,
    incompatibleGroups: [],
    ...overrides,
  };
}

function countOf(items: readonly Item[], key: string): number {
  return buildCatalogCoverage(items).find((row) => row.key === key)?.count ?? -1;
}

describe('buildCatalogCoverage', () => {
  it('boş katalogda tüm dallar sıfırdır', () => {
    expect(buildCatalogCoverage([]).every((row) => row.count === 0)).toBe(true);
  });

  it('kısıt taşıyan ürünleri kendi dalında sayar', () => {
    const items = [
      item({ id: 'a', isStackable: false }),
      item({ id: 'b', maxStackCount: 3 }),
      item({ id: 'c', maxWeightOnTop: 50 }),
      item({ id: 'd', fragility: 1 }),
      item({ id: 'e', allowedRotations: 2 }),
    ];

    expect(countOf(items, 'nonStackable')).toBe(1);
    expect(countOf(items, 'maxStackCount')).toBe(1);
    expect(countOf(items, 'maxWeightOnTop')).toBe(1);
    expect(countOf(items, 'fragile')).toBe(1);
    expect(countOf(items, 'rotation:Fixed')).toBe(1);
  });

  /**
   * Motor yalnızca FragilityType=1 için dallanıyor; 2-9 ayrıştırma sınıfı ve
   * başka bir yoldan işliyor. Hepsini kırılgan saymak kapsamayı şişirirdi.
   */
  it('yalnızca FragilityType=1 kırılgan sayılır', () => {
    expect(countOf([item({ fragility: 5 })], 'fragile')).toBe(0);
  });

  // Motor `<= 0` değerini SINIRSIZ sayıyor; sıfır bir kısıt değildir.
  it('sıfır istif ve üst ağırlık sınırı kısıt sayılmaz', () => {
    const unlimited = [item({ maxStackCount: 0, maxWeightOnTop: 0 })];
    expect(countOf(unlimited, 'maxStackCount')).toBe(0);
    expect(countOf(unlimited, 'maxWeightOnTop')).toBe(0);
  });

  it('kayıt biçimi yalnızca anahtar ve adet taşır', () => {
    const counts = toCoverageCounts(buildCatalogCoverage([item({ fragility: 1 })]));
    expect(counts).toContainEqual({ key: 'fragile', count: 1 });
    expect(Object.keys(counts[0])).toEqual(['key', 'count']);
  });
});

describe('isConstrainedItem', () => {
  it('kısıtsız ürünü kısıtlı saymaz', () => {
    expect(isConstrainedItem(item())).toBe(false);
  });

  it.each([
    ['istiflenemez', { isStackable: false }],
    ['istif adedi sınırlı', { maxStackCount: 2 }],
    ['üst ağırlık sınırlı', { maxWeightOnTop: 30 }],
    ['kırılgan', { fragility: 1 }],
    ['rotasyonu kısıtlı', { allowedRotations: 3 }],
    ['ayrışım grubu var', { stackGroup: 'gida' }],
    ['uyumsuz grubu var', { incompatibleGroups: ['kimyasal'] }],
  ])('%s ürünü kısıtlı sayar', (_label, overrides) => {
    expect(isConstrainedItem(item(overrides as Partial<Item>))).toBe(true);
  });
});
