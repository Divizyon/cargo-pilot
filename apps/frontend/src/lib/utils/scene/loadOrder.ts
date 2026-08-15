import type { PlacementWithDimensions } from '@/lib/types/loadingPlan';
import { DoorType, findDoor, fillsFromMaxX, type VehicleDoor } from '@/lib/types/vehicle';

/**
 * Yükleme sırası — yükleme, kapıya değmeyen köşeden başlar
 * (docs/COORDINATE_STANDARD.md §7).
 *
 * Referans kapı z = length'tedir, bu yüzden Z her zaman küçük→büyük ilerler:
 * uzak yüzdeki (z = 0) kutular önce girer, kapıya en yakın olanlar en son.
 *
 * Yan kapı yalnızca X'in hangi uçtan başlayacağını belirler:
 * - yan kapı x = width'te ya da hiç yoksa → X küçük→büyük (x = 0 duvarı önce)
 * - yan kapı x = 0'da                     → X büyük→küçük (x = width duvarı önce)
 *
 * Yalnızca üst kapısı olan araçta yükleme yukarıdan yapılır: alt kat önce girer.
 */
export function buildLoadOrder(
  placements: PlacementWithDimensions[],
  doors: readonly VehicleDoor[] = [],
): number[] {
  const xSign = fillsFromMaxX(doors) ? -1 : 1;

  // Sadece tavandan yükleniyorsa katman ekseni Y'dir; yandan ya da arkadan
  // yükleme varsa kutular zeminden ilerler ve Y ikincil eksende kalır.
  const loadsFromTop =
    findDoor(doors, DoorType.Top) !== undefined &&
    findDoor(doors, DoorType.Small) === undefined &&
    findDoor(doors, DoorType.Big) === undefined;

  return placements
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const pa = a.p;
      const pb = b.p;

      if (loadsFromTop) {
        if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
        if (pa.positionZ !== pb.positionZ) return pa.positionZ - pb.positionZ;
        return xSign * (pa.positionX - pb.positionX);
      }

      if (pa.positionZ !== pb.positionZ) return pa.positionZ - pb.positionZ;
      if (pa.positionY !== pb.positionY) return pa.positionY - pb.positionY;
      return xSign * (pa.positionX - pb.positionX);
    })
    .map(({ i }) => i);
}
