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
    a.positionZ < b.positionZ + b.length &&
    b.positionZ < a.positionZ + a.length
  );
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
    if (placements[i].isStagingArea) continue;
    for (let j = i + 1; j < placements.length; j++) {
      if (placements[j].isStagingArea) continue;
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
