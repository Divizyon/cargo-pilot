import { z } from 'zod';
import { DoorFace, DoorType, type Vehicle, type VehicleDoor } from '@/lib/types/vehicle';

/**
 * Eski tekil `LoadingType` değerinden kapı listesi türetir.
 * Backend: Rear=0, SideRight=1, SideLeft=2, Top=4 (SideBoth=3 kaldırıldı).
 *
 * Yalnızca `doors` alanı boş gelen kayıtlar için kullanılır. Eskiden mapper
 * kapıyı hep bu alandan türetiyor ve yan kapı varyantlarını tek bir `Side`
 * değerine indiriyordu; x = 0 ile x = width ayrımı kaybolduğu için başlangıç
 * köşesi doğrulaması hiç yapılamıyordu (denetim S-12/S-38/S-43).
 */
const DOORS_FROM_LOADING_TYPE: Record<number, readonly VehicleDoor[]> = {
  0: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
  1: [{ type: DoorType.Big, face: DoorFace.WidthX }],
  2: [{ type: DoorType.Big, face: DoorFace.ZeroX }],
  4: [{ type: DoorType.Top, face: DoorFace.HeightY }],
};

export function doorsFromLoadingType(loadingType: number | null | undefined): VehicleDoor[] {
  if (loadingType == null) return [];
  const mapped = DOORS_FROM_LOADING_TYPE[loadingType];
  if (!mapped) {
    console.warn(
      `[vehicleMappers] Bilinmeyen loadingType değeri: ${loadingType} — kapı listesi türetilemedi.`,
    );
    return [];
  }
  return [...mapped];
}

/** Liste doluysa o geçerli; boşsa eski tekil alandan türetilir. */
export function resolveDoors(
  doors: readonly VehicleDoor[] | null | undefined,
  loadingType: number | null | undefined,
): VehicleDoor[] {
  if (doors && doors.length > 0) return [...doors];
  return doorsFromLoadingType(loadingType);
}

const vehicleDoorSchema = z.object({
  type: z.enum(Object.values(DoorType) as [DoorType, ...DoorType[]]),
  face: z.enum(Object.values(DoorFace) as [DoorFace, ...DoorFace[]]),
});

export const vehicleListApiItemSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  plateNumber: z.string().nullable().optional(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  loadingType: z.number().int().nullable().optional(),
  doors: z.array(vehicleDoorSchema).nullable().optional(),
});

export type VehicleListApiItem = z.infer<typeof vehicleListApiItemSchema>;

export function fromApiVehicleListItem(api: VehicleListApiItem): Vehicle {
  return {
    id: api.id,
    name: api.vehicleName,
    plate: api.plateNumber ?? undefined,
    width: api.internalWidth,
    height: api.internalHeight,
    length: api.internalLength,
    maxCargoWeight: api.maxWeightCapacity,
    doors: resolveDoors(api.doors, api.loadingType),
  };
}
