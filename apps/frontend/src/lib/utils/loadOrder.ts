import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

/**
 * Yükleme sırası: arka duvardan kapıya (Z küçük→büyük), alt kattan üst kata (Y küçük→büyük),
 * soldan sağa (X küçük→büyük).
 * Z=0 arka duvar, Z=length kapı — içeridekiler önce yüklenir.
 *
 * Backend bu sırayı hesaplayıp gönderirse bu fonksiyon atlanabilir.
 * Şimdilik client-side sort ile simüle edilmektedir.
 *
 * Döndürülen değer: orijinal `placements` dizisindeki global index listesi,
 * yükleme sırasına göre sıralı.
 */
export function buildLoadOrder(placements: PlacementWithDimensions[]): number[] {
  return placements
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      if (a.p.positionZ !== b.p.positionZ) return a.p.positionZ - b.p.positionZ;
      if (a.p.positionY !== b.p.positionY) return a.p.positionY - b.p.positionY;
      return a.p.positionX - b.p.positionX;
    })
    .map(({ i }) => i);
}
