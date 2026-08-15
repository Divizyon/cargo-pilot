import { describe, expect, it } from 'vitest';
import type { Item } from '@/lib/types/item';
import { DoorDirection, type Vehicle } from '@/lib/types/vehicle';
import { MAX_TOTAL_BOX_COUNT } from '../schemas/algorithmTestRequestSchema';
import { createRng } from './seededRandom';
import { generateSuite } from './suiteGenerator';

function vehicle(id: string, length: number): Vehicle {
  return {
    id,
    name: `Araç ${id}`,
    width: 240,
    height: 260,
    length,
    maxCargoWeight: 20000,
    doorDirection: DoorDirection.Rear,
  };
}

function item(id: string, size: number, overrides: Partial<Item> = {}): Item {
  return {
    id,
    name: `Ürün ${id}`,
    sku: id,
    width: size,
    height: size,
    length: size,
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

const vehicles = [vehicle('v1', 1360), vehicle('v2', 600)];
const catalog = [item('a', 40), item('b', 60), item('c', 80), item('d', 50), item('e', 30)];

describe('createRng', () => {
  it('aynı tohum aynı diziyi verir', () => {
    const first = Array.from({ length: 20 }, () => createRng(7).next());
    const second = Array.from({ length: 20 }, () => createRng(7).next());
    expect(first).toEqual(second);
  });

  it('farklı tohum farklı dizi verir', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  // Tohum 0 mulberry32'de sabit dizi üretir; kullanıcı 0 yazabiliyor.
  it('tohum 0 dejenere dizi üretmez', () => {
    const rng = createRng(0);
    const values = Array.from({ length: 5 }, () => rng.next());
    expect(new Set(values).size).toBe(5);
  });

  it('int iki ucu da kapsar ve aralık dışına çıkmaz', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it('shuffle kaynağı bozmaz ve elemanları korur', () => {
    const source = [1, 2, 3, 4, 5];
    const shuffled = createRng(9).shuffle(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual(source);
  });
});

describe('generateSuite', () => {
  /**
   * Toplu koşunun tüm değeri buna bağlı: motorun iki sürümü ancak BİREBİR aynı
   * senaryo setiyle karşılaştırılabilir. Bu kırılırsa karşılaştırma sessizce
   * anlamsızlaşır — ölçülen şey motorun değişimi değil, girdinin değişimi olur.
   */
  it('aynı tohum birebir aynı senaryoları üretir', () => {
    expect(generateSuite(42, 30, vehicles, catalog)).toEqual(
      generateSuite(42, 30, vehicles, catalog),
    );
  });

  it('farklı tohum farklı senaryolar üretir', () => {
    expect(generateSuite(1, 10, vehicles, catalog)).not.toEqual(
      generateSuite(2, 10, vehicles, catalog),
    );
  });

  it('istenen sayıda senaryo üretir ve sırayı 1den başlatır', () => {
    const suite = generateSuite(5, 12, vehicles, catalog);
    expect(suite).toHaveLength(12);
    expect(suite.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('katalog boşsa boş liste döner', () => {
    expect(generateSuite(1, 5, vehicles, [])).toEqual([]);
    expect(generateSuite(1, 5, [], catalog)).toEqual([]);
  });

  // Motor 500 kutuda reddediyor (OptimizationLimits.cs); üretim bunu aşamaz.
  it('hiçbir senaryo kutu sınırını aşmaz', () => {
    for (const scenario of generateSuite(11, 60, vehicles, catalog)) {
      expect(scenario.totalBoxes).toBeLessThanOrEqual(MAX_TOTAL_BOX_COUNT);
      expect(scenario.totalBoxes).toBeGreaterThan(0);
    }
  });

  it('adetler toplamı bildirilen kutu sayısına eşittir', () => {
    for (const scenario of generateSuite(13, 40, vehicles, catalog)) {
      const sum = scenario.items.reduce((total, i) => total + i.quantity, 0);
      expect(sum).toBe(scenario.totalBoxes);
      expect(scenario.items.every((i) => i.quantity >= 1)).toBe(true);
    }
  });

  it('gruplu senaryolarda boşaltma sıraları 1..groupCount aralığında kalır', () => {
    for (const scenario of generateSuite(17, 60, vehicles, catalog)) {
      const orders = scenario.items.map((i) => i.groupNumber);
      if (scenario.groupCount === 0) {
        expect(orders.every((o) => o === 0)).toBe(true);
      } else {
        expect(orders.every((o) => o >= 1 && o <= scenario.groupCount)).toBe(true);
        // LIFO bölgesi ancak 2+ farklı sırada oluşur; grup sayısı fiilen dolmalı.
        expect(new Set(orders).size).toBe(scenario.groupCount);
      }
    }
  });

  it('gruplu ve grupsuz senaryoları birlikte üretir', () => {
    const suite = generateSuite(23, 60, vehicles, catalog);
    expect(suite.some((s) => s.groupCount > 0)).toBe(true);
    expect(suite.some((s) => s.groupCount === 0)).toBe(true);
  });

  // Kör rastgele adet senaryoların çoğunu ya boş ya tamamen taşan yapardı.
  it('doluluk hedefi senaryoları anlamlı aralığa yayar', () => {
    const suite = generateSuite(31, 60, vehicles, catalog);
    const single = suite.filter((s) => s.totalBoxes === 1);
    expect(single.length / suite.length).toBeLessThan(0.2);
  });
});

describe('generateSuite — kısıt kapsaması', () => {
  /**
   * Kısıtlı ürün katalogda azınlıkta (gerçek durum: birkaç kırılgan ürün, çok
   * sayıda düz koli). Kör rastgele seçimde istif, kırılganlık ve rotasyon
   * dalları neredeyse hiç koşulmuyor; toplu koşu yüzlerce senaryo boyunca
   * motorun yalnızca en kolay yolunu ölçüyordu.
   */
  const skewed = [
    item('p1', 40),
    item('p2', 60),
    item('p3', 80),
    item('p4', 50),
    item('kirilgan', 45, { fragility: 1 }),
  ];

  it('senaryoların çoğuna kısıtlı ürün sokar', () => {
    const suite = generateSuite(101, 80, vehicles, skewed);
    const withConstrained = suite.filter((s) => s.constrainedItemCount > 0);
    expect(withConstrained.length / suite.length).toBeGreaterThan(0.5);
  });

  // Temel dalın gerilemesini yakalamak için kısıtsız senaryolar da gerekli.
  it('kısıtsız senaryolar da üretir', () => {
    const suite = generateSuite(101, 80, vehicles, skewed);
    expect(suite.some((s) => s.constrainedItemCount === 0)).toBe(true);
  });

  it('katalogda hiç kısıtlı ürün yoksa yine senaryo üretir', () => {
    const suite = generateSuite(7, 20, vehicles, catalog);
    expect(suite).toHaveLength(20);
    expect(suite.every((s) => s.constrainedItemCount === 0)).toBe(true);
  });

  // Aynı ürün iki kez seçilirse motora gönderilen gövde geçersiz olur.
  it('bir senaryoda aynı ürün iki kez yer almaz', () => {
    for (const scenario of generateSuite(202, 80, vehicles, skewed)) {
      const itemIds = scenario.items.map((i) => i.itemId);
      expect(new Set(itemIds).size).toBe(itemIds.length);
    }
  });

  it('kısıt odaklı seçim determinizmi bozmaz', () => {
    expect(generateSuite(303, 40, vehicles, skewed)).toEqual(
      generateSuite(303, 40, vehicles, skewed),
    );
  });
});
