import { z } from 'zod';
import { DoorDirection, type Vehicle } from '@/lib/types/vehicle';

/**
 * Yükleme yönü. Backend `LoadingType`: Rear=0, SideRight=1, SideLeft=2,
 * SideBoth=3, Top=4. Motor için önemli olan tek ayrım arka kapı olup olmadığı —
 * LIFO bölgeleri yalnızca arka kapıda oluşur (LifoPlacement.cs:44-73) — bu
 * yüzden yan kapı varyantları tek yöne iner.
 */
const DOOR_DIRECTION_FROM_LOADING_TYPE: Record<number, DoorDirection> = {
  0: DoorDirection.Rear,
  1: DoorDirection.Side,
  2: DoorDirection.Side,
  3: DoorDirection.Side,
  4: DoorDirection.Top,
};

export function resolveDoorDirection(loadingType: number | null | undefined): DoorDirection {
  if (loadingType == null) return DoorDirection.Rear;
  return DOOR_DIRECTION_FROM_LOADING_TYPE[loadingType] ?? DoorDirection.Rear;
}

export const vehicleListApiItemSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  plateNumber: z.string().nullable().optional(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  loadingType: z.number().int().nullable().optional(),
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
    doorDirection: resolveDoorDirection(api.loadingType),
  };
}
