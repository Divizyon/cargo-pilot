import { describe, expect, it } from 'vitest';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { DoorDirection } from '@/lib/types/vehicle';
import { computeGroupZones, zoneOverflowCm } from './lifoZones';

const LIFO = OptimizationCriteria.Lifo;

describe('computeGroupZones', () => {
  it('LIFO dışı kriterde bölge oluşmaz', () => {
    expect(
      computeGroupZones([1, 2], 300, DoorDirection.Rear, OptimizationCriteria.VolumeFirst),
    ).toEqual([]);
  });

  it('arka kapı dışında bölge oluşmaz', () => {
    expect(computeGroupZones([1, 2], 300, DoorDirection.Side, LIFO)).toEqual([]);
    expect(computeGroupZones([1, 2], 300, DoorDirection.Top, LIFO)).toEqual([]);
  });

  it('tek boşaltma sırasında bölge oluşmaz', () => {
    expect(computeGroupZones([1], 300, DoorDirection.Rear, LIFO)).toEqual([]);
    expect(computeGroupZones([2, 2, 2], 300, DoorDirection.Rear, LIFO)).toEqual([]);
  });

  it('araç uzunluğunu eşit dilimlere böler', () => {
    expect(computeGroupZones([1, 2], 300, DoorDirection.Rear, LIFO)).toEqual([
      { unloadingOrder: 1, zStart: 0, zEnd: 150 },
      { unloadingOrder: 2, zStart: 150, zEnd: 300 },
    ]);
  });

  it('ilk inecek grup kapıya (Z=0) en yakın bölgeye düşer', () => {
    const zones = computeGroupZones([3, 1, 2], 300, DoorDirection.Rear, LIFO);
    expect(zones.map((z) => z.unloadingOrder)).toEqual([1, 2, 3]);
    expect(zones[0].zStart).toBe(0);
    expect(zones[2].zEnd).toBe(300);
  });
});

describe('zoneOverflowCm', () => {
  const zone = { unloadingOrder: 1, zStart: 100, zEnd: 200 };

  it('bölge içinde taşma yok', () => {
    expect(zoneOverflowCm(120, 50, zone)).toBe(0);
  });

  it('bölge sınırlarına tam oturmak taşma değil', () => {
    expect(zoneOverflowCm(100, 100, zone)).toBe(0);
  });

  it('iki uçtaki taşmayı ayrı ayrı ölçüp toplar', () => {
    expect(zoneOverflowCm(90, 20, zone)).toBe(10);
    expect(zoneOverflowCm(190, 20, zone)).toBe(10);
    expect(zoneOverflowCm(90, 130, zone)).toBe(30);
  });
});
