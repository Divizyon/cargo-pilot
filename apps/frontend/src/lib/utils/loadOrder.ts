import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { DoorDirection } from '@/lib/types/vehicle';

/**
 * Yükleme sırası — kapı yönüne göre "kapıya en uzak" kutular önce girilir.
 *
 * rear  (Z=0):       Z büyük→küçük, sonra Y küçük→büyük (alt kat önce), X küçük→büyük
 * front (Z=length):  Z küçük→büyük, sonra Y küçük→büyük, X küçük→büyük
 * side  right (X=W): X küçük→büyük (sol duvar önce), sonra Y küçük→büyük, Z küçük→büyük
 * side  left  (X=0): X büyük→küçük (sağ duvar önce), sonra Y küçük→büyük, Z küçük→büyük
 * top   (Y=H):       Y küçük→büyük (alt kat önce), sonra Z büyük→küçük, X küçük→büyük
 *
 * Her yön için "katman" tanımı:
 *   rear/front → Z katmanı  (kutunun kapıya olan Z mesafesi)
 *   side       → X katmanı
 *   top        → Y katmanı
 *
 * Aynı katmandaki kutular Y küçük→büyük (alt önce), ardından diğer eksen küçük→büyük.
 */
export function buildLoadOrder(
  placements: PlacementWithDimensions[],
  doorDirection?: DoorDirection,
  doorSide?: 'right' | 'left',
): number[] {
  return placements
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const pa = a.p;
      const pb = b.p;

      switch (doorDirection) {
        case 'rear':
          // Kapı Z=0 — Z büyükten küçüğe (arka duvar son, kapı önce)
          if (pa.positionZ !== pb.positionZ) return pb.positionZ - pa.positionZ;
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          return pa.positionX - pb.positionX;

        case 'side': {
          // Sağ kapı X=width → X küçük→büyük (sol duvar önce girer)
          // Sol kapı X=0    → X büyük→küçük (sağ duvar önce girer)
          const xSign = doorSide === 'left' ? -1 : 1;
          const xDiff = xSign * (pa.positionX - pb.positionX);
          if (xDiff !== 0) return xDiff;
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          return pa.positionZ - pb.positionZ;
        }

        case 'top':
          // Kapı Y=height — Y küçük→büyük (zemin katı önce girer)
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          if (pa.positionZ !== pb.positionZ) return pb.positionZ - pa.positionZ;
          return pa.positionX - pb.positionX;

        case 'rearAndSide': {
          // Hem arka hem yan kapı — rear öncelikli
          if (pa.positionZ !== pb.positionZ) return pb.positionZ - pa.positionZ;
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          return pa.positionX - pb.positionX;
        }

        default:
          // 'front' veya undefined — kapı Z=length, Z küçük→büyük (arka duvar önce, kapıya yakın son)
          if (pa.positionZ !== pb.positionZ) return pa.positionZ - pb.positionZ;
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          return pa.positionX - pb.positionX;
      }
    })
    .map(({ i }) => i);
}
