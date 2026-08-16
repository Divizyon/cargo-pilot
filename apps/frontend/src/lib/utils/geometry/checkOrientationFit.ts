import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';

/**
 * Dikdörtgenler prizması collision — tüm ürün tipleri için geçerli.
 * Varil: width=length=çap, height=yükseklik olarak çağrılır.
 */
export function fitsInVehicle(
  posX: number,
  posY: number,
  posZ: number,
  width: number,
  height: number,
  length: number,
  vehicle: Vehicle,
): boolean {
  return (
    posX >= 0 &&
    posY >= 0 &&
    posZ >= 0 &&
    posX + width <= vehicle.width &&
    posY + height <= vehicle.height &&
    posZ + length <= vehicle.length
  );
}

// Sol-alt-arka origin: kutunun bounds'u positionX..positionX+width gibi.
export function isInsideContainer(p: PlacementWithDimensions, vehicle: Vehicle): boolean {
  return fitsInVehicle(p.positionX, p.positionY, p.positionZ, p.width, p.height, p.length, vehicle);
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
    if (p.isStagingArea) return p;
    const overflow = !isInsideContainer(p, vehicle);
    if (!overflow || p.isViolation) return p;
    mutated = true;
    return { ...p, isViolation: true };
  });
  return mutated ? next : placements;
}
