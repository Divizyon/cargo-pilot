import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import type { DoorDirection } from '@/lib/types/vehicle';

/**
 * Yükleme sırası — kapıya en uzak kutular önce girer.
 *
 * Referans kapı z = length'tedir (docs/COORDINATE_STANDARD.md §2-3), bu yüzden
 * yükleme her zaman uzak yüzden (z = 0) kapıya doğru ilerler: Z küçük→büyük.
 * Bu yön kapı tipinden bağımsızdır; kapı yalnızca hangi eksenin "katman" ekseni
 * olduğunu belirler.
 *
 * small door (z = length): Z küçük→büyük, sonra Y küçük→büyük (alt kat önce), X küçük→büyük
 * big door   (x = width):  X küçük→büyük (x = 0 duvarı önce), sonra Y, sonra Z küçük→büyük
 * big door   (x = 0):      X büyük→küçük (x = width duvarı önce), sonra Y, sonra Z küçük→büyük
 * top        (y = height): Y küçük→büyük (alt kat önce), sonra Z küçük→büyük, X küçük→büyük
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
          // Kapı y = height — Y küçük→büyük (zemin katı önce girer), ardından
          // yükleme yönü: Z küçük→büyük.
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          if (pa.positionZ !== pb.positionZ) return pa.positionZ - pb.positionZ;
          return pa.positionX - pb.positionX;

        default:
          // Referans kapı z = length: uzak yüzdeki (z = 0) kutular önce girer,
          // kapıya en yakın olanlar en son. 'rear', 'rearAndSide' ve tanımsız
          // değer aynı yönü paylaşır.
          if (pa.positionZ !== pb.positionZ) return pa.positionZ - pb.positionZ;
          if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
          return pa.positionX - pb.positionX;
      }
    })
    .map(({ i }) => i);
}
