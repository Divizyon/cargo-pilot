import { describe, expect, it } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { isGhosted, isPlacementVisible } from './sceneFilter';

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

const EMPTY_STATE = {
  selectedInstanceId: null,
  selectedItemId: null,
  hiddenItemIds: [] as string[],
};

describe('isGhosted', () => {
  it('activeLayer = 0 (default) → hiçbir kutu ghost değil', () => {
    expect(isGhosted({ positionZ: 0, depth: 50 }, 0)).toBe(false);
    expect(isGhosted({ positionZ: 500, depth: 50 }, 0)).toBe(false);
  });

  it('positionZ < activeLayer → ghost', () => {
    expect(isGhosted({ positionZ: 100, depth: 50 }, 200)).toBe(true);
  });

  it('positionZ === activeLayer → ghost değil (tam sınırda normal)', () => {
    expect(isGhosted({ positionZ: 200, depth: 50 }, 200)).toBe(false);
  });

  it('positionZ > activeLayer → ghost değil', () => {
    expect(isGhosted({ positionZ: 300, depth: 50 }, 200)).toBe(false);
  });

  it('negatif activeLayer → hiçbir kutu ghost değil', () => {
    expect(isGhosted({ positionZ: 0, depth: 50 }, -1)).toBe(false);
  });

  it('slider max (vehicle.length) → tüm kutular ghost', () => {
    expect(isGhosted({ positionZ: 0, depth: 50 }, 600)).toBe(true);
    expect(isGhosted({ positionZ: 550, depth: 50 }, 600)).toBe(true);
  });
});

describe('isPlacementVisible', () => {
  it('default state ile kutu görünür', () => {
    expect(isPlacementVisible(makePlacement(), 0, EMPTY_STATE)).toBe(true);
  });

  it('hiddenItemIds içinde olan SKU gizlenir', () => {
    const p = makePlacement({ itemId: 'sku-a' });
    expect(
      isPlacementVisible(p, 0, { ...EMPTY_STATE, hiddenItemIds: ['sku-a'] satisfies string[] }),
    ).toBe(false);
  });

  it('selectedInstanceId tıklananı gizler (BoxWrapper devralır)', () => {
    expect(isPlacementVisible(makePlacement(), 3, { ...EMPTY_STATE, selectedInstanceId: 3 })).toBe(
      false,
    );
  });

  it("selectedItemId varken, selectedInstanceId null ise aynı itemId'liler gizlenir", () => {
    const p = makePlacement({ itemId: 'sku-x' });
    expect(
      isPlacementVisible(p, 0, {
        ...EMPTY_STATE,
        selectedInstanceId: null,
        selectedItemId: 'sku-x',
      }),
    ).toBe(false);
  });

  it('selectedInstanceId aktifse selectedItemId override edilir (sadece o instance gizli)', () => {
    const p = makePlacement({ itemId: 'sku-x' });
    expect(
      isPlacementVisible(p, 0, {
        ...EMPTY_STATE,
        selectedInstanceId: 5,
        selectedItemId: 'sku-x',
      }),
    ).toBe(true);
  });

  it('activeLayer ghost mode isPlacementVisible etkilemez — ghost ayrı mesh, gizleme değil', () => {
    const p = makePlacement({ positionZ: 0, depth: 50 });
    expect(isPlacementVisible(p, 0, EMPTY_STATE)).toBe(true);
  });
});
