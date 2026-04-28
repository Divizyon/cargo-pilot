import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';

// Sol-alt-arka origin: kutunun bounds'u positionX..positionX+width gibi.
export function isInsideContainer(p: PlacementWithDimensions, vehicle: Vehicle): boolean {
  return (
    p.positionX >= 0 &&
    p.positionY >= 0 &&
    p.positionZ >= 0 &&
    p.positionX + p.width <= vehicle.width &&
    p.positionY + p.height <= vehicle.height &&
    p.positionZ + p.depth <= vehicle.length
  );
}

/**
 * Konteyner taşma kontrolü — overflow'a düşen placement'lara isViolation=true ekler.
 * Mevcut isViolation=true bayraklarını korur (collision pipeline çıktısı üstüne yazar).
 */
export function applyContainerOverflow(
  placements: PlacementWithDimensions[],
  vehicle: Vehicle | null,
): PlacementWithDimensions[] {
  if (!vehicle) return placements;
  let mutated = false;
  const next = placements.map((p) => {
    const overflow = !isInsideContainer(p, vehicle);
    if (!overflow || p.isViolation) return p;
    mutated = true;
    return { ...p, isViolation: true };
  });
  return mutated ? next : placements;
}
