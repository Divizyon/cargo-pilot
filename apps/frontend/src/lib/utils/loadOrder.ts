import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';

/**
 * Yükleme sırası: arka duvardan kapıya (Z büyük→küçük), alt kattan üst kata (Y küçük→büyük),
 * soldan sağa (X küçük→büyük).
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
      if (b.p.positionZ !== a.p.positionZ) return b.p.positionZ - a.p.positionZ;
      if (a.p.positionY !== b.p.positionY) return a.p.positionY - b.p.positionY;
      return a.p.positionX - b.p.positionX;
    })
    .map(({ i }) => i);
}
