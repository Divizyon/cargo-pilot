import { describe, expect, it } from 'vitest';
import { DoorType, DoorFace, type Vehicle } from '@/lib/types/vehicle';
import type { Item } from '@/lib/types/item';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { buildPlacements } from './usePlanStore';

/**
 * Denetim S-18/S-19: manuel yerleşim imleci kapı listesini hiç okumuyordu ve
 * bekleme alanındaki kutuları da sayıyordu.
 */

const SMALL = { type: DoorType.Small, face: DoorFace.LengthZ } as const;
const BIG_LEFT = { type: DoorType.Big, face: DoorFace.ZeroX } as const;
const BIG_RIGHT = { type: DoorType.Big, face: DoorFace.WidthX } as const;

function vehicle(doors: Vehicle['doors']): Vehicle {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test',
    vehicleType: 'Tir',
    width: 200,
    height: 200,
    length: 400,
    maxCargoWeight: 10_000,
    doors,
    isFavorite: false,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(0).toISOString(),
    createdBy: { id: '', fullName: '' },
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'urun-1',
    name: 'Koli',
    sku: 'SKU-1',
    width: 100,
    height: 50,
    length: 50,
    weight: 10,
    isStackable: true,
    ...overrides,
  } as Item;
}

function staging(overrides: Partial<PlacementWithDimensions> = {}): PlacementWithDimensions {
  return {
    itemId: 'bekleyen',
    positionX: 0,
    positionY: 0,
    positionZ: 500,
    orientationIndex: 0,
    layer: 1,
    isViolation: false,
    isStagingArea: true,
    width: 100,
    height: 50,
    length: 50,
    weight: 9_000,
    ...overrides,
  } as PlacementWithDimensions;
}

describe('buildPlacements — başlangıç köşesi kapıya bağlı', () => {
  it('büyük kapı yokken x = 0’dan başlar', () => {
    const { placed } = buildPlacements(item(), 1, '#fff', vehicle([SMALL]), []);
    expect(placed[0].positionX).toBe(0);
  });

  it('büyük kapı x = 0 iken karşı duvardan başlar', () => {
    const { placed } = buildPlacements(item(), 1, '#fff', vehicle([SMALL, BIG_LEFT]), []);
    // Araç 200 geniş, kutu 100 geniş → sol kenar 100, sağ kenar 200.
    expect(placed[0].positionX).toBe(100);
  });

  it('büyük kapı x = width iken origin köşesinden başlar', () => {
    const { placed } = buildPlacements(item(), 1, '#fff', vehicle([SMALL, BIG_RIGHT]), []);
    expect(placed[0].positionX).toBe(0);
  });

  it('aynalanmış modda sıra karşı duvara doğru ilerler', () => {
    const { placed } = buildPlacements(item(), 2, '#fff', vehicle([SMALL, BIG_LEFT]), []);
    expect(placed.map((p) => p.positionX)).toEqual([100, 0]);
  });
});

describe('buildPlacements — bekleme alanı hesaba katılmaz', () => {
  it('bekleyen kutu imleci ileri kaydırmaz', () => {
    const { placed } = buildPlacements(item(), 1, '#fff', vehicle([SMALL]), [staging()]);
    expect(placed[0].positionZ).toBe(0);
  });

  it('bekleyen kutunun ağırlığı limite sayılmaz', () => {
    // Araç 10.000 kg; bekleyen kutu 9.000 kg. Sayılsaydı 200 kg’lık ürün
    // "ağırlık limiti" gerekçesiyle reddedilirdi.
    const { placed, unfitByReason } = buildPlacements(
      item({ weight: 2_000 }),
      1,
      '#fff',
      vehicle([SMALL]),
      [staging()],
    );

    expect(placed).toHaveLength(1);
    expect(unfitByReason).toEqual({});
  });
});
