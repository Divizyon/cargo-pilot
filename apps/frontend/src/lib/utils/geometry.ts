import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

/**
 * AABB intersection check for two axis-aligned boxes.
 *
 * Positions are bottom-left-rear corners in centimeters (scene contract).
 * Two boxes that only share a face (touching but not overlapping) return false.
 */
export function boxesIntersect(a: PlacementWithDimensions, b: PlacementWithDimensions): boolean {
  return (
    a.positionX < b.positionX + b.width &&
    b.positionX < a.positionX + a.width &&
    a.positionY < b.positionY + b.height &&
    b.positionY < a.positionY + a.height &&
    a.positionZ < b.positionZ + b.depth &&
    b.positionZ < a.positionZ + a.depth
  );
}

interface BoxDimensions {
  width: number;
  height: number;
  depth: number;
}

interface VehicleBounds {
  width: number;
  height: number;
  length: number;
}

interface FreeSlotResult {
  positionX: number;
  positionY: number;
  positionZ: number;
  fits: boolean;
}

/**
 * Finds the first collision-free position for a box using a shelf-based scan.
 *
 * Scans X → Z → Y order. For each candidate position, checks against all
 * occupied boxes (existing + already-placed siblings from this batch).
 * Returns fits:false if no position exists within vehicle bounds.
 */
export function findFreeSlot(
  box: BoxDimensions,
  vehicle: VehicleBounds,
  occupied: PlacementWithDimensions[],
  isStackable: boolean,
): FreeSlotResult {
  const { width: w, height: h, depth: d } = box;

  // Collect unique X and Z breakpoints from occupied boxes so we jump to
  // exact edges rather than scanning every centimetre.
  const xBreaks = [...new Set([0, ...occupied.map((p) => p.positionX + p.width)])].sort(
    (a, b) => a - b,
  );
  const zBreaks = [...new Set([0, ...occupied.map((p) => p.positionZ + p.depth)])].sort(
    (a, b) => a - b,
  );
  const yBreaks = isStackable
    ? [...new Set([0, ...occupied.map((p) => p.positionY + p.height)])].sort((a, b) => a - b)
    : [0];

  const probe = (px: number, py: number, pz: number): boolean => {
    if (px + w > vehicle.width) return false;
    if (py + h > vehicle.height) return false;
    if (pz + d > vehicle.length) return false;
    const candidate = {
      positionX: px,
      positionY: py,
      positionZ: pz,
      width: w,
      height: h,
      depth: d,
    } as PlacementWithDimensions;
    return !occupied.some((o) => boxesIntersect(candidate, o));
  };

  for (const py of yBreaks) {
    for (const pz of zBreaks) {
      for (const px of xBreaks) {
        if (probe(px, py, pz)) return { positionX: px, positionY: py, positionZ: pz, fits: true };
      }
    }
  }

  return { positionX: 0, positionY: 0, positionZ: 0, fits: false };
}

/**
 * Recomputes isViolation for every placement in the list.
 * A placement is marked as a violation when it intersects with any other placement.
 * O(n²) — acceptable for typical cargo counts (< 1000 boxes).
 */
export function computeViolations(
  placements: PlacementWithDimensions[],
): PlacementWithDimensions[] {
  const violating = new Set<number>();

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      if (boxesIntersect(placements[i], placements[j])) {
        violating.add(i);
        violating.add(j);
      }
    }
  }

  if (violating.size === 0) {
    // Avoid new array allocation when nothing changed from false.
    const alreadyClear = placements.every((p) => !p.isViolation);
    if (alreadyClear) return placements;
  }

  return placements.map((p, i) => {
    const shouldViolate = violating.has(i);
    if (p.isViolation === shouldViolate) return p;
    return { ...p, isViolation: shouldViolate };
  });
}
