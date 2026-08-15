import type { Placement } from '@/lib/types/loadingPlan';

/**
 * İki eksen hizalı kutunun AABB kesişim kontrolü.
 * Konumlar sol-alt-arka köşe, santimetre cinsinden. Yalnızca yüzey paylaşan
 * (değen ama içine girmeyen) kutular kesişmiş sayılmaz.
 */
export function boxesIntersect(a: Placement, b: Placement): boolean {
  return (
    a.positionX < b.positionX + b.width &&
    b.positionX < a.positionX + a.width &&
    a.positionY < b.positionY + b.height &&
    b.positionY < a.positionY + a.height &&
    a.positionZ < b.positionZ + b.depth &&
    b.positionZ < a.positionZ + a.depth
  );
}

/** Kenar uzunluklarından hacim (cm³). */
export function calcVolume(a: number, b: number, c: number): number {
  return a * b * c;
}
