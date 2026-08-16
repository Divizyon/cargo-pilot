import { describe, expect, it } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { DoorType, DoorFace, type VehicleDoor } from '@/lib/types/vehicle';
import { buildLoadOrder } from './loadOrder';

function makePlacement(overrides: Partial<PlacementWithDimensions> = {}): PlacementWithDimensions {
  return {
    itemId: '00000000-0000-0000-0000-000000000001',
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    orientationIndex: 0,
    layer: 1,
    isViolation: false,
    width: 50,
    height: 50,
    length: 50,
    weight: 10,
    ...overrides,
  };
}

const REAR: VehicleDoor = { type: DoorType.Small, face: DoorFace.LengthZ };
const SIDE_RIGHT: VehicleDoor = { type: DoorType.Big, face: DoorFace.WidthX };
const SIDE_LEFT: VehicleDoor = { type: DoorType.Big, face: DoorFace.ZeroX };
const TOP: VehicleDoor = { type: DoorType.Top, face: DoorFace.HeightY };

describe('buildLoadOrder — yan kapının X yönüne etkisi', () => {
  // Aynı Y ve Z'de, X=0 (sol duvar) ve X=100 (sağ duvar) kutuları.
  const leftBox = makePlacement({ positionX: 0 });
  const rightBox = makePlacement({ positionX: 100 });
  const placements = [rightBox, leftBox]; // index 0 = sağdaki, index 1 = soldaki

  it('yan kapı x = width → yükleme x = 0 köşesinden başlar', () => {
    // Serbest köşe (0,0,0): soldaki kutu (index 1) önce girer.
    expect(buildLoadOrder(placements, [REAR, SIDE_RIGHT])).toEqual([1, 0]);
  });

  it('yan kapı x = 0 → yükleme x = width köşesinden başlar', () => {
    // Serbest köşe (width,0,0): sağdaki kutu (index 0) önce girer.
    expect(buildLoadOrder(placements, [REAR, SIDE_LEFT])).toEqual([0, 1]);
  });

  it('yan kapı yoksa X küçük→büyük ilerler', () => {
    expect(buildLoadOrder(placements, [REAR])).toEqual([1, 0]);
    expect(buildLoadOrder(placements, [])).toEqual([1, 0]);
  });
});

describe('buildLoadOrder — Z yönü kapıdan bağımsızdır', () => {
  const nearDoorBox = makePlacement({ positionZ: 200 });
  const farFaceBox = makePlacement({ positionZ: 0 });

  it('uzak yüzdeki (z = 0) kutu her zaman önce girer', () => {
    // Referans kapı z = length'te; yükleme z = 0'dan kapıya doğru ilerler.
    const rear = buildLoadOrder([nearDoorBox, farFaceBox], [REAR]);
    expect(rear).toEqual([1, 0]);
    expect(buildLoadOrder([nearDoorBox, farFaceBox], [REAR, SIDE_RIGHT])).toEqual(rear);
    expect(buildLoadOrder([nearDoorBox, farFaceBox], [SIDE_LEFT])).toEqual(rear);
    expect(buildLoadOrder([nearDoorBox, farFaceBox], [])).toEqual(rear);
  });

  it('yalnızca üst kapı varsa katman ekseni Y olur', () => {
    const lower = makePlacement({ positionY: 0, positionZ: 200 });
    const upper = makePlacement({ positionY: 100, positionZ: 0 });
    // Tavandan yüklemede alt kat önce girer; Z ikincil kalır.
    expect(buildLoadOrder([upper, lower], [TOP])).toEqual([1, 0]);
  });

  it('üst kapı arka kapıyla birlikteyse yükleme yine zeminden ilerler', () => {
    const lower = makePlacement({ positionY: 0, positionZ: 200 });
    const upper = makePlacement({ positionY: 100, positionZ: 0 });
    // Z birincil: z = 0'daki üst kutu (index 0) önce girer.
    expect(buildLoadOrder([upper, lower], [REAR, TOP])).toEqual([0, 1]);
  });
});

describe('buildLoadOrder — bekleme alanı kutuları sıraya girmez', () => {
  it('staging kutuları listeden düşer, indeksler kaymaz', () => {
    const staging = makePlacement({ positionZ: 0, isStagingArea: true });
    const aracIci = makePlacement({ positionZ: 100 });

    // index 0 = staging, index 1 = araç içi → yalnızca 1 dönmeli.
    expect(buildLoadOrder([staging, aracIci], [REAR])).toEqual([1]);
  });

  it('hepsi bekleme alanındaysa sıra boş kalır', () => {
    const staging = makePlacement({ isStagingArea: true });
    expect(buildLoadOrder([staging, staging], [REAR])).toEqual([]);
  });
});
