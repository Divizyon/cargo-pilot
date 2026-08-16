import { describe, expect, it } from 'vitest';
import { OptimizationCriteria } from '@/lib/types/loadingPlan';
import { DoorFace, DoorType, type VehicleDoor } from '@/lib/types/vehicle';

const REAR: VehicleDoor[] = [{ type: DoorType.Small, face: DoorFace.LengthZ }];
const SIDE: VehicleDoor[] = [{ type: DoorType.Big, face: DoorFace.WidthX }];
const TOP: VehicleDoor[] = [{ type: DoorType.Top, face: DoorFace.HeightY }];
import { computeGroupZones, zoneOverflowCm } from './lifoZones';

const LIFO = OptimizationCriteria.Lifo;

describe('computeGroupZones', () => {
  it('LIFO dışı kriterde bölge oluşmaz', () => {
    expect(
      computeGroupZones([1, 2], 300, REAR, OptimizationCriteria.VolumeFirst),
    ).toEqual([]);
  });

  it('arka kapı dışında bölge oluşmaz', () => {
    expect(computeGroupZones([1, 2], 300, SIDE, LIFO)).toEqual([]);
    expect(computeGroupZones([1, 2], 300, TOP, LIFO)).toEqual([]);
  });

  it('tek boşaltma sırasında bölge oluşmaz', () => {
    expect(computeGroupZones([1], 300, REAR, LIFO)).toEqual([]);
    expect(computeGroupZones([2, 2, 2], 300, REAR, LIFO)).toEqual([]);
  });

  it('araç uzunluğunu eşit dilimlere böler', () => {
    // Motorla aynı yön: ilk inecek grup kapı ucunda (z = length).
    expect(computeGroupZones([1, 2], 300, REAR, LIFO)).toEqual([
      { unloadingOrder: 1, zStart: 150, zEnd: 300 },
      { unloadingOrder: 2, zStart: 0, zEnd: 150 },
    ]);
  });

  it('ilk inecek grup kapıya (Z=length) en yakın bölgeye düşer', () => {
    const zones = computeGroupZones([3, 1, 2], 300, REAR, LIFO);
    expect(zones.map((z) => z.unloadingOrder)).toEqual([1, 2, 3]);
    expect(zones[0].zEnd).toBe(300);
    expect(zones[2].zStart).toBe(0);
  });

  it('bölme tam kapanmadığında son bölge uzak yüze oturur', () => {
    // 250/3 decimal'de kalıntı bırakır; kalıntı taşma gibi ölçülmemeli.
    const zones = computeGroupZones([1, 2, 3], 250, REAR, LIFO);
    expect(zones[2].zStart).toBe(0);
    expect(zones[0].zEnd).toBe(250);
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
