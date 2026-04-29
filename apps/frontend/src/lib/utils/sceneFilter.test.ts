import { describe, expect, it } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { isAboveActiveLayer, isPlacementVisible } from './sceneFilter';

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
    ...overrides,
  };
}

const EMPTY_STATE = {
  activeLayer: Number.POSITIVE_INFINITY,
  selectedInstanceId: null,
  selectedItemId: null,
  hiddenItemIds: [] as string[],
};

describe('isAboveActiveLayer', () => {
  it('+Infinity activeLayer → hiçbir kutu üstte değil', () => {
    expect(isAboveActiveLayer({ positionY: 100, height: 50 }, Number.POSITIVE_INFINITY)).toBe(
      false,
    );
  });

  it('kutunun tavanı tam activeLayer hizasında ise üstte sayılmaz', () => {
    // y=100, h=50 → tavan = 150. activeLayer = 150 → 150 > 150 false → görünür.
    expect(isAboveActiveLayer({ positionY: 100, height: 50 }, 150)).toBe(false);
  });

  it('kutunun tavanı activeLayer üstündeyse üstte', () => {
    // tavan = 150, activeLayer = 149 → 150 > 149 → gizli.
    expect(isAboveActiveLayer({ positionY: 100, height: 50 }, 149)).toBe(true);
  });

  it('activeLayer = 0 ise yere oturmuş kutu bile gizlenir', () => {
    expect(isAboveActiveLayer({ positionY: 0, height: 50 }, 0)).toBe(true);
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
    // index 0, selectedInstanceId 5 — kutu görünür kalmalı (selectedItemId match'ine rağmen)
    expect(
      isPlacementVisible(p, 0, {
        ...EMPTY_STATE,
        selectedInstanceId: 5,
        selectedItemId: 'sku-x',
      }),
    ).toBe(true);
  });

  it('activeLayer üstündeki kutu gizlenir', () => {
    const p = makePlacement({ positionY: 200, height: 50 });
    expect(isPlacementVisible(p, 0, { ...EMPTY_STATE, activeLayer: 100 })).toBe(false);
  });

  it('activeLayer altındaki kutu görünür', () => {
    const p = makePlacement({ positionY: 0, height: 50 });
    expect(isPlacementVisible(p, 0, { ...EMPTY_STATE, activeLayer: 100 })).toBe(true);
  });
});
