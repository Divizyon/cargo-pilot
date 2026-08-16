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
    length: 50,
    weight: 10,
    ...overrides,
  };
}

const EMPTY_STATE = {
  selectedInstanceId: null,
  selectedItemId: null,
  hiddenItemIds: [] as string[],
};

describe('isGhosted — X-Ray kapı tarafından soyar', () => {
  const VEHICLE_LENGTH = 400;

  it('peel = 0 (varsayılan) → hiçbir kutu ghost değil', () => {
    expect(isGhosted({ positionZ: 0, length: 50 }, 0, null, VEHICLE_LENGTH)).toBe(false);
    expect(isGhosted({ positionZ: 350, length: 50 }, 0, null, VEHICLE_LENGTH)).toBe(false);
  });

  it('kapıya en yakın kutu önce soyulur', () => {
    // Kapı z = 400; 100 cm soyulunca z = 300..400 aralığı ghost olur.
    expect(isGhosted({ positionZ: 350, length: 50 }, 100, null, VEHICLE_LENGTH)).toBe(true);
    expect(isGhosted({ positionZ: 0, length: 50 }, 100, null, VEHICLE_LENGTH)).toBe(false);
  });

  it('uzak yüzdeki kutu en son soyulur', () => {
    expect(isGhosted({ positionZ: 0, length: 50 }, 350, null, VEHICLE_LENGTH)).toBe(false);
    expect(isGhosted({ positionZ: 0, length: 50 }, 400, null, VEHICLE_LENGTH)).toBe(true);
  });

  it('tam sınırdaki kutu ghost değil', () => {
    // Kutunun kapıya bakan yüzü tam eşikte: henüz soyulmadı.
    expect(isGhosted({ positionZ: 250, length: 50 }, 100, null, VEHICLE_LENGTH)).toBe(false);
  });

  it('negatif peel → hiçbir kutu ghost değil', () => {
    expect(isGhosted({ positionZ: 0, length: 50 }, -1, null, VEHICLE_LENGTH)).toBe(false);
  });

  it('araç uzunluğu verilmezse eski (uzak yüzden) davranış korunur', () => {
    expect(isGhosted({ positionZ: 100, length: 50 }, 200)).toBe(true);
    expect(isGhosted({ positionZ: 300, length: 50 }, 200)).toBe(false);
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
    const p = makePlacement({ positionZ: 0, length: 50 });
    expect(isPlacementVisible(p, 0, EMPTY_STATE)).toBe(true);
  });
});
