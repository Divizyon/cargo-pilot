import { DoorType, DoorFace, findDoor, type VehicleDoor } from '@/lib/types/vehicle';

/** Formdaki üç seçenek: küçük kapı / büyük kapı / ikisi birden. */
export type DoorSetKey = 'small' | 'big' | 'both';

/**
 * Seçimi kapı listesine çevirir.
 *
 * Formda sorulmayan kapı tipleri (bugün yalnızca üst kapı) olduğu gibi taşınır.
 * Eskiden liste sıfırdan kuruluyordu, yani üst kapısı olan bir araç formda ilk
 * tıklamada o kapıyı sessizce kaybediyordu (denetim S-26).
 */
export function buildDoors(
  setKey: DoorSetKey,
  bigDoorFace: DoorFace,
  mevcutDoors: readonly VehicleDoor[],
): VehicleDoor[] {
  const doors: VehicleDoor[] = [];
  if (setKey === 'small' || setKey === 'both') {
    doors.push({ type: DoorType.Small, face: DoorFace.LengthZ });
  }
  if (setKey === 'big' || setKey === 'both') {
    doors.push({ type: DoorType.Big, face: bigDoorFace });
  }

  const digerTipler = mevcutDoors.filter(
    (door) => door.type !== DoorType.Small && door.type !== DoorType.Big,
  );

  return [...doors, ...digerTipler];
}

/**
 * Kapı listesinden üç seçenekten hangisinin aktif olduğunu bulur.
 *
 * Yalnızca üst kapısı olan araçta hiçbiri seçili değildir (`null`) — bu doğru:
 * üç seçenek arka/yan kapıyı anlatıyor, üst kapı formda sorulmuyor. O araçta
 * kullanıcı bir seçim yaparsa üst kapı `buildDoors` sayesinde korunur.
 */
export function resolveSetKey(doors: readonly VehicleDoor[]): DoorSetKey | null {
  const hasSmall = findDoor(doors, DoorType.Small) !== undefined;
  const hasBig = findDoor(doors, DoorType.Big) !== undefined;

  if (hasSmall && hasBig) return 'both';
  if (hasBig) return 'big';
  if (hasSmall) return 'small';
  return null;
}
