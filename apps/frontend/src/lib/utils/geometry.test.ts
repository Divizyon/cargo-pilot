import { describe, expect, it } from 'vitest';
import { boxesIntersect, computeViolations } from './geometry';
import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

function box(
  positionX: number,
  positionY: number,
  positionZ: number,
  width: number,
  height: number,
  depth: number,
): PlacementWithDimensions {
  return {
    itemId: '00000000-0000-0000-0000-000000000001',
    positionX,
    positionY,
    positionZ,
    width,
    height,
    depth,
    rotation: 0,
    layer: 1,
    isViolation: false,
  };
}

describe('boxesIntersect', () => {
  it('detects overlapping boxes', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(5, 5, 5, 10, 10, 10);
    expect(boxesIntersect(a, b)).toBe(true);
  });

  it('returns false for boxes that only share a face (touching)', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(10, 0, 0, 10, 10, 10); // B starts exactly where A ends on X
    expect(boxesIntersect(a, b)).toBe(false);
  });

  it('returns false for completely separated boxes', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(20, 0, 0, 10, 10, 10);
    expect(boxesIntersect(a, b)).toBe(false);
  });

  it('detects overlap when separated on Y but overlapping on X and Z', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(0, 15, 0, 10, 10, 10); // separated on Y
    expect(boxesIntersect(a, b)).toBe(false);
  });

  it('detects overlap when one box is fully inside another', () => {
    const outer = box(0, 0, 0, 20, 20, 20);
    const inner = box(5, 5, 5, 5, 5, 5);
    expect(boxesIntersect(outer, inner)).toBe(true);
  });

  it('is symmetric', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(5, 5, 5, 10, 10, 10);
    expect(boxesIntersect(a, b)).toBe(boxesIntersect(b, a));
  });

  it('returns true for identical boxes (same position)', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(0, 0, 0, 10, 10, 10);
    expect(boxesIntersect(a, b)).toBe(true);
  });

  it('handles partial overlap on Z axis only', () => {
    const a = box(0, 0, 0, 10, 10, 10);
    const b = box(0, 0, 8, 10, 10, 10); // overlaps by 2 cm on Z
    expect(boxesIntersect(a, b)).toBe(true);
  });
});

describe('computeViolations', () => {
  it('marks both boxes as violations when they intersect', () => {
    const placements = [
      box(0, 0, 0, 10, 10, 10),
      box(5, 5, 5, 10, 10, 10),
    ];
    const result = computeViolations(placements);
    expect(result[0].isViolation).toBe(true);
    expect(result[1].isViolation).toBe(true);
  });

  it('leaves non-intersecting boxes without violation', () => {
    const placements = [
      box(0, 0, 0, 10, 10, 10),
      box(10, 0, 0, 10, 10, 10), // touching, not overlapping
    ];
    const result = computeViolations(placements);
    expect(result[0].isViolation).toBe(false);
    expect(result[1].isViolation).toBe(false);
  });

  it('only marks the overlapping pair, not an adjacent clean box', () => {
    const placements = [
      box(0, 0, 0, 10, 10, 10),   // intersects with [1]
      box(5, 5, 5, 10, 10, 10),   // intersects with [0]
      box(50, 50, 50, 10, 10, 10), // isolated — no violation
    ];
    const result = computeViolations(placements);
    expect(result[0].isViolation).toBe(true);
    expect(result[1].isViolation).toBe(true);
    expect(result[2].isViolation).toBe(false);
  });

  it('returns empty array for empty input', () => {
    expect(computeViolations([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    const placements = [box(0, 0, 0, 10, 10, 10)];
    const result = computeViolations(placements);
    expect(result[0].isViolation).toBe(false);
  });

  it('returns same reference when nothing changed (no violations, no mutation needed)', () => {
    const placements = [
      box(0, 0, 0, 10, 10, 10),
      box(20, 0, 0, 10, 10, 10),
    ];
    const result = computeViolations(placements);
    expect(result).toBe(placements); // referential equality — no unnecessary re-render
  });

  it('clears isViolation when boxes are moved apart', () => {
    const violating = [
      { ...box(0, 0, 0, 10, 10, 10), isViolation: true },
      { ...box(5, 5, 5, 10, 10, 10), isViolation: true },
    ];
    // Simulate moving second box away
    const moved = [violating[0], { ...violating[1], positionX: 50, positionY: 50, positionZ: 50 }];
    const result = computeViolations(moved);
    expect(result[0].isViolation).toBe(false);
    expect(result[1].isViolation).toBe(false);
  });
});
