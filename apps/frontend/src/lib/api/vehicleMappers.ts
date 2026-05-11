import { z } from 'zod';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';

// Backend: Trailer=0, Truck=1, Container=2, Romork=3
export const VEHICLE_TYPE_INT = {
  Tir: 0, // Trailer
  Kamyon: 1, // Truck
  Konteyner: 2, // Container
  Kamposet: 3, // Romork
} as const;

// Backend: Rear=0, SideRight=1, SideLeft=2, SideBoth=3, Top=4
export const VEHICLE_TYPE_FROM_INT: Record<number, VehicleType> = {
  0: VehicleType.Tir,
  1: VehicleType.Kamyon,
  2: VehicleType.Konteyner,
  3: VehicleType.Kamposet,
};

// loadingType int → { direction, doorSide }
export const LOADING_TYPE_FROM_INT: Record<
  number,
  { direction: DoorDirection; doorSide?: 'right' | 'left' }
> = {
  0: { direction: DoorDirection.Rear },
  1: { direction: DoorDirection.Side, doorSide: 'right' },
  2: { direction: DoorDirection.Side, doorSide: 'left' },
  3: { direction: DoorDirection.RearAndSide },
  4: { direction: DoorDirection.Top },
};

// ─── Backend response schema ──────────────────────────────────────────────────

export const vehicleApiSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  vehicleType: z.number().int(),
  description: z.string().optional().nullable(),
  plateNumber: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  internalLength: z.number(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  maxWeightCapacity: z.number(),
  grossWeight: z.number().optional().nullable(),
  tareWeight: z.number().optional().nullable(),
  layerCount: z.number().int().optional().nullable(),
  loadingType: z.number().int(),
  kingPinDistanceMm: z.number().optional().nullable(),
  kingPinTareWeightKg: z.number().optional().nullable(),
  kingPinMaxLoadKg: z.number().optional().nullable(),
  mainAxleDistanceMm: z.number().optional().nullable(),
  mainAxleTareWeightKg: z.number().optional().nullable(),
  mainAxleMaxLoadKg: z.number().optional().nullable(),
  additionalAxleDistanceMm: z.number().optional().nullable(),
  additionalAxleTareWeightKg: z.number().optional().nullable(),
  additionalAxleMaxLoadKg: z.number().optional().nullable(),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  status: z.string().optional().nullable(),
  createdAt: z.string(),
  createdBy: z.object({ id: z.string(), fullName: z.string() }).optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  updatedBy: z.object({ id: z.string(), fullName: z.string() }).optional().nullable(),
});

export type VehicleApi = z.infer<typeof vehicleApiSchema>;

export const paginatedVehiclesApiSchema = z.object({
  data: z.object({
    items: z.array(vehicleApiSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

export const singleVehicleApiSchema = z.object({
  data: vehicleApiSchema,
});

// ─── Backend → frontend mappers ───────────────────────────────────────────────

export function fromApiVehicle(api: VehicleApi): Vehicle {
  const kingpin =
    api.kingPinDistanceMm != null && api.kingPinMaxLoadKg != null
      ? {
          distance: api.kingPinDistanceMm,
          tareWeight: api.kingPinTareWeightKg ?? 0,
          maxLoad: api.kingPinMaxLoadKg,
        }
      : undefined;

  const axleB =
    api.mainAxleDistanceMm != null && api.mainAxleMaxLoadKg != null
      ? {
          distance: api.mainAxleDistanceMm,
          tareWeight: api.mainAxleTareWeightKg ?? 0,
          maxLoad: api.mainAxleMaxLoadKg,
        }
      : undefined;

  const additionalAxle =
    api.additionalAxleDistanceMm != null && api.additionalAxleMaxLoadKg != null
      ? {
          distance: api.additionalAxleDistanceMm,
          tareWeight: api.additionalAxleTareWeightKg ?? 0,
          maxLoad: api.additionalAxleMaxLoadKg,
        }
      : undefined;

  const vehicleType = VEHICLE_TYPE_FROM_INT[api.vehicleType] ?? VehicleType.Tir;
  const isContainer = vehicleType === VehicleType.Konteyner;
  return {
    id: api.id,
    name: api.vehicleName,
    vehicleType,
    description: api.description ?? undefined,
    plate: isContainer ? undefined : (api.plateNumber ?? undefined),
    serialNumber: isContainer ? (api.plateNumber ?? undefined) : undefined,
    length: api.internalLength,
    width: api.internalWidth,
    height: api.internalHeight,
    maxCargoWeight: api.maxWeightCapacity,
    grossWeight: api.grossWeight ?? undefined,
    tareWeight: api.tareWeight ?? undefined,
    maxLayerCount: api.layerCount ?? undefined,
    doorDirection: LOADING_TYPE_FROM_INT[api.loadingType]?.direction ?? DoorDirection.Rear,
    doorSide: LOADING_TYPE_FROM_INT[api.loadingType]?.doorSide,
    kingpin,
    axleB,
    axles: additionalAxle ? [additionalAxle] : undefined,
    isFavorite: api.isFavorite,
    isActive: api.isActive,
    isDeleted: api.isDeleted,
    status: (api.status as 'active' | 'draft' | undefined) ?? undefined,
    createdAt: api.createdAt,
    createdBy: api.createdBy ?? { id: '', fullName: '' },
    updatedAt: api.updatedAt ?? undefined,
    updatedBy: api.updatedBy ?? undefined,
  };
}

export function vehicleToFormValues(v: Vehicle): Partial<VehicleFormValues> {
  return {
    vehicleType: v.vehicleType,
    name: v.name,
    description: v.description,
    plate: v.plate,
    serialNumber: v.serialNumber,
    length: v.length,
    width: v.width,
    height: v.height,
    maxCargoWeight: v.maxCargoWeight,
    grossWeight: v.grossWeight,
    tareWeight: v.tareWeight,
    maxLayerCount: v.maxLayerCount,
    doorDirection: v.doorDirection,
    doorSide: v.doorSide,
    kingpin: v.kingpin,
    axleB: v.axleB,
    axles: v.axles,
    isActive: v.isActive,
    status: v.status,
  };
}

// ─── Frontend → backend request builder ──────────────────────────────────────

export interface CreateVehicleRequest {
  vehicleName: string;
  vehicleType: number;
  description?: string;
  plateNumber: string;
  internalLength: number;
  internalWidth: number;
  internalHeight: number;
  maxWeightCapacity: number;
  grossWeight?: number | null;
  tareWeight?: number | null;
  layerCount: number;
  loadingType: number;
  isActive?: boolean;
  status?: string | null;
  kingPinDistanceMm?: number | null;
  kingPinTareWeightKg?: number | null;
  kingPinMaxLoadKg?: number | null;
  mainAxleDistanceMm?: number | null;
  mainAxleTareWeightKg?: number | null;
  mainAxleMaxLoadKg?: number | null;
  additionalAxleDistanceMm?: number | null;
  additionalAxleTareWeightKg?: number | null;
  additionalAxleMaxLoadKg?: number | null;
}

export function buildCreateVehiclePayload(values: VehicleFormValues): CreateVehicleRequest {
  return {
    vehicleName: values.name,
    vehicleType: VEHICLE_TYPE_INT[values.vehicleType],
    description: values.description?.trim() ?? '',
    plateNumber:
      values.vehicleType === VehicleType.Konteyner
        ? (values.serialNumber?.trim() ?? '')
        : (values.plate?.trim() ?? ''),
    internalLength: Number.isFinite(values.length) ? values.length : 0,
    internalWidth: Number.isFinite(values.width) ? values.width : 0,
    internalHeight: Number.isFinite(values.height) ? values.height : 0,
    maxWeightCapacity: Number.isFinite(values.maxCargoWeight) ? values.maxCargoWeight : 0,
    grossWeight: Number.isFinite(values.grossWeight) ? values.grossWeight : null,
    tareWeight: Number.isFinite(values.tareWeight) ? values.tareWeight : null,
    layerCount: Number.isFinite(values.maxLayerCount) ? (values.maxLayerCount ?? 1) : 1,
    loadingType: (() => {
      if (values.doorDirection === 'side') {
        return values.doorSide === 'left' ? 2 : 1; // SideLeft=2, SideRight=1
      }
      const map: Record<string, number> = { rear: 0, rearAndSide: 3, top: 4 };
      return map[values.doorDirection] ?? 0;
    })(),
    isActive: values.isActive ?? true,
    ...(values.status === 'draft' ? { status: 'draft' } : {}),
    kingPinDistanceMm: Number.isFinite(values.kingpin?.distance) ? values.kingpin!.distance : null,
    kingPinTareWeightKg: Number.isFinite(values.kingpin?.tareWeight)
      ? values.kingpin!.tareWeight
      : null,
    kingPinMaxLoadKg: Number.isFinite(values.kingpin?.maxLoad) ? values.kingpin!.maxLoad : null,
    mainAxleDistanceMm: Number.isFinite(values.axleB?.distance) ? values.axleB!.distance : null,
    mainAxleTareWeightKg: values.axleB != null ? (values.axleB.tareWeight ?? 0) : null,
    mainAxleMaxLoadKg: Number.isFinite(values.axleB?.maxLoad) ? values.axleB!.maxLoad : null,
    additionalAxleDistanceMm: Number.isFinite(values.axles?.[0]?.distance)
      ? values.axles![0].distance
      : null,
    additionalAxleTareWeightKg:
      values.axles?.[0] != null ? (values.axles[0].tareWeight ?? 0) : null,
    additionalAxleMaxLoadKg: Number.isFinite(values.axles?.[0]?.maxLoad)
      ? values.axles![0].maxLoad
      : null,
  };
}

export function buildUpdateVehiclePayload(
  id: string,
  values: VehicleFormValues,
): CreateVehicleRequest & { id: string } {
  return { id, ...buildCreateVehiclePayload(values) };
}
