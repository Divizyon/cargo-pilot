import type { Placement } from '@/lib/types/loadingPlan';
import { CONTACT_EPSILON_CM } from '@/algorithm-test/verification/geometryPredicates';

/**
 * İki eksen hizalı kutunun AABB kesişim kontrolü.
 * Konumlar kutunun origin'e en yakın köşesi (min x, min y, min z), santimetre
 * cinsinden. Yalnızca yüzey paylaşan
 * (değen ama içine girmeyen) kutular kesişmiş sayılmaz.
 *
 * Motor `decimal` ile çalışır ve temas tam eşitliktir; istemcide aynı değerler
 * double'a dönüştüğü için bitişik kutular ~1e-13 cm örtüşüyor görünebiliyor.
 * `CONTACT_EPSILON_CM` bu artığı yutar — eşiksiz sürüm bunu gerçek çakışma
 * sayıp sert kural ihlali raporluyordu.
 */
export function boxesIntersect(a: Placement, b: Placement): boolean {
  return (
    a.positionX < b.positionX + b.width - CONTACT_EPSILON_CM &&
    b.positionX < a.positionX + a.width - CONTACT_EPSILON_CM &&
    a.positionY < b.positionY + b.height - CONTACT_EPSILON_CM &&
    b.positionY < a.positionY + a.height - CONTACT_EPSILON_CM &&
    a.positionZ < b.positionZ + b.length - CONTACT_EPSILON_CM &&
    b.positionZ < a.positionZ + a.length - CONTACT_EPSILON_CM
  );
}

/** Kenar uzunluklarından hacim (cm³). */
export function calcVolume(a: number, b: number, c: number): number {
  return a * b * c;
}
