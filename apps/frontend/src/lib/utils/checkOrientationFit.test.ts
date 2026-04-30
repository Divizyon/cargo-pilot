import { describe, expect, it } from 'vitest';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { applyContainerOverflow, isInsideContainer } from './checkOrientationFit';

const VEHICLE: Vehicle = {
  id: '00000000-0000-0000-0000-000000000099',
  name: 'Test Konteyner',
  width: 200,
  height: 240,
  length: 600,
  payload: 5000,
};

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

describe('isInsideContainer', () => {
  it('origin köşesinde tam sığan kutu içeride', () => {
    expect(isInsideContainer(makePlacement(), VEHICLE)).toBe(true);
  });

  it('konteynerin tam sınırında biten kutu içeride', () => {
    const p = makePlacement({
      positionX: VEHICLE.width - 50,
      positionY: VEHICLE.height - 50,
      positionZ: VEHICLE.length - 50,
    });
    expect(isInsideContainer(p, VEHICLE)).toBe(true);
  });

  it('width tarafında taşma → dışarıda', () => {
    const p = makePlacement({ positionX: VEHICLE.width - 49 });
    expect(isInsideContainer(p, VEHICLE)).toBe(false);
  });

  it('height tarafında taşma → dışarıda', () => {
    const p = makePlacement({ positionY: VEHICLE.height - 49 });
    expect(isInsideContainer(p, VEHICLE)).toBe(false);
  });

  it('length tarafında taşma → dışarıda', () => {
    const p = makePlacement({ positionZ: VEHICLE.length - 49 });
    expect(isInsideContainer(p, VEHICLE)).toBe(false);
  });

  it('negatif pozisyon → dışarıda', () => {
    expect(isInsideContainer(makePlacement({ positionX: -1 }), VEHICLE)).toBe(false);
  });
});

describe('applyContainerOverflow', () => {
  it('vehicle null iken aynı array döner', () => {
    const placements = [makePlacement()];
    expect(applyContainerOverflow(placements, null)).toBe(placements);
  });

  it('overflow yok ve hiç violation yok → aynı referans korunur', () => {
    const placements = [makePlacement()];
    expect(applyContainerOverflow(placements, VEHICLE)).toBe(placements);
  });

  it('overflow varsa isViolation=true bayrağı eklenir', () => {
    const overflowing = makePlacement({ positionZ: VEHICLE.length });
    const result = applyContainerOverflow([overflowing], VEHICLE);
    expect(result[0].isViolation).toBe(true);
  });

  it('zaten isViolation=true olan kutuya tekrar yazılmaz (collision üstüne yazma yok)', () => {
    const collision = makePlacement({ isViolation: true });
    const result = applyContainerOverflow([collision], VEHICLE);
    expect(result[0]).toBe(collision);
  });
});
