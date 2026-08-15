import { describe, expect, it } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
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
    depth: 50,
    weight: 10,
    ...overrides,
  };
}

describe('buildLoadOrder — yan kapı (side) sağ/sol dalı', () => {
  // Aynı Y ve Z'de, X=0 (sol duvar) ve X=100 (sağ duvar) kutuları.
  const leftBox = makePlacement({ positionX: 0 });
  const rightBox = makePlacement({ positionX: 100 });
  const placements = [rightBox, leftBox]; // index 0 = sağdaki, index 1 = soldaki

  it('doorSide=right → kapı X=width, sol duvar (X küçük) önce girer', () => {
    const order = buildLoadOrder(placements, 'side', 'right');
    // leftBox (index 1, X=0) sağ kapıya en uzak → önce girer
    expect(order).toEqual([1, 0]);
  });

  it('doorSide=left → kapı X=0, sağ duvar (X büyük) önce girer', () => {
    const order = buildLoadOrder(placements, 'side', 'left');
    // rightBox (index 0, X=100) sol kapıya en uzak → önce girer
    expect(order).toEqual([0, 1]);
  });

  it('doorSide belirtilmemiş → sağ kapı varsayımına düşer (SideBoth eşlemesiyle tutarlı)', () => {
    const withoutSide = buildLoadOrder(placements, 'side', undefined);
    const withRight = buildLoadOrder(placements, 'side', 'right');
    expect(withoutSide).toEqual(withRight);
  });
});

describe('buildLoadOrder — referans kapı ve üst kapı dalları', () => {
  // Referans kapı z = length'te; uzak yüzdeki (z = 0) kutu önce girer.
  const farFaceBox = makePlacement({ positionZ: 0 });
  const doorSideBox = makePlacement({ positionZ: 200 });

  it('rear: Z küçükten büyüğe sıralanır (uzak yüz önce, kapıya yakın son)', () => {
    const order = buildLoadOrder([doorSideBox, farFaceBox], 'rear');
    expect(order).toEqual([1, 0]);
  });

  it('rearAndSide ve tanımsız kapı aynı yükleme yönünü paylaşır', () => {
    const rear = buildLoadOrder([doorSideBox, farFaceBox], 'rear');
    expect(buildLoadOrder([doorSideBox, farFaceBox], 'rearAndSide')).toEqual(rear);
    expect(buildLoadOrder([doorSideBox, farFaceBox], undefined)).toEqual(rear);
  });

  it('top: Y küçükten büyüğe sıralanır (zemin katı önce)', () => {
    const bottom = makePlacement({ positionY: 0 });
    const top = makePlacement({ positionY: 100 });
    const order = buildLoadOrder([top, bottom], 'top');
    expect(order).toEqual([1, 0]);
  });

  it('top: aynı katta yükleme yönü korunur (Z küçük→büyük)', () => {
    const order = buildLoadOrder([doorSideBox, farFaceBox], 'top');
    expect(order).toEqual([1, 0]);
  });
});
