import type { Placement } from '@/lib/types/loadingPlan';

/**
 * Motor `decimal` ile çalışır ve "üst yüzü tam olarak aday tabanına denk gelen"
 * karşılaştırmasını tam eşitlikle yapar (PlacementValidator.cs:73). İstemcide
 * aynı değerler JSON üzerinden double'a dönüşür, bu yüzden tam eşitlik yerine
 * epsilon kullanılır — aksi hâlde kayan nokta artığı yüzünden desteği olan bir
 * kutu desteksiz görünürdü.
 */
export const CONTACT_EPSILON_CM = 1e-6;

/** Kutunun üst yüzünün Y'si. */
export function topY(placement: Placement): number {
  return placement.positionY + placement.height;
}

/**
 * X-Z düzlemindeki örtüşme alanı (cm²) — PlacementValidator.cs:74-76 ile aynı
 * hesap. Motor `> 0` ile kesin eşitsizlik kullanır: yalnızca kenar paylaşan
 * kutular örtüşmüş sayılmaz.
 */
export function footprintOverlapArea(a: Placement, b: Placement): number {
  const overlapX = Math.max(
    0,
    Math.min(a.positionX + a.width, b.positionX + b.width) - Math.max(a.positionX, b.positionX),
  );
  const overlapZ = Math.max(
    0,
    Math.min(a.positionZ + a.length, b.positionZ + b.length) - Math.max(a.positionZ, b.positionZ),
  );
  return overlapX * overlapZ;
}

export function footprintsOverlap(a: Placement, b: Placement): boolean {
  return footprintOverlapArea(a, b) > 0;
}

/**
 * `above` doğrudan `below`'un üstüne mi oturuyor — motorun `b.Y + b.H == y`
 * koşulunun aynası (PlacementValidator.cs:100). İstiflenebilirlik ve LIFO dikey
 * kuralı yalnızca doğrudan alttakine bakar.
 */
export function restsDirectlyOn(above: Placement, below: Placement): boolean {
  if (above === below) return false;
  if (Math.abs(topY(below) - above.positionY) > CONTACT_EPSILON_CM) return false;
  return footprintsOverlap(above, below);
}

/**
 * `candidate`, `below`'un üstündeki yığında mı — motorun `c.Y >= b.Y + b.H`
 * koşulunun aynası (PlacementValidator.cs:135). İstif adedi, üst ağırlık ve
 * kırılganlık kuralları doğrudan alttakine değil, üstteki TÜM kutulara bakar.
 */
export function isAnywhereAbove(candidate: Placement, below: Placement): boolean {
  if (candidate === below) return false;
  if (candidate.positionY < topY(below) - CONTACT_EPSILON_CM) return false;
  return footprintsOverlap(candidate, below);
}

/** `below`'un üstündeki yığındaki kutuların indeksleri. */
export function indicesAbove(placements: Placement[], belowIndex: number): number[] {
  const below = placements[belowIndex];
  const result: number[] = [];
  for (let i = 0; i < placements.length; i++) {
    if (i !== belowIndex && isAnywhereAbove(placements[i], below)) result.push(i);
  }
  return result;
}
