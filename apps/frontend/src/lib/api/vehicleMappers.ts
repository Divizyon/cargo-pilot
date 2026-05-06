import { z } from 'zod';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType, DoorDirection, type Vehicle } from '@/lib/types/vehicle';

export const VEHICLE_TYPE_INT = {
  Tir: 0,
  Kamyon: 1,
  Kamposet: 2,
  Konteyner: 3,
} as const;

export const LOADING_TYPE_INT = {
  rear: 0,
  side: 1,
  top: 2,
  rearAndSide: 3,
} as const;

const VEHICLE_TYPE_FROM_INT: Record<number, VehicleType> = {
  0: VehicleType.Tir,
  1: VehicleType.Kamyon,
  2: VehicleType.Kamposet,
  3: VehicleType.Konteyner,
};

const DOOR_DIR_FROM_INT: Record<number, DoorDirection> = {
  0: DoorDirection.Rear,
  1: DoorDirection.Side,
  2: DoorDirection.Top,
  3: DoorDirection.RearAndSide,
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
    vehicles: z.array(vehicleApiSchema),
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

  return {
    id: api.id,
    name: api.vehicleName,
    vehicleType: VEHICLE_TYPE_FROM_INT[api.vehicleType] ?? VehicleType.Tir,
    description: api.description ?? undefined,
    plate: api.plateNumber ?? undefined,
    serialNumber: api.serialNumber ?? undefined,
    length: api.internalLength,
    width: api.internalWidth,
    height: api.internalHeight,
    maxCargoWeight: api.maxWeightCapacity,
    grossWeight: api.grossWeight ?? undefined,
    tareWeight: api.tareWeight ?? undefined,
    maxLayerCount: api.layerCount ?? undefined,
    doorDirection: DOOR_DIR_FROM_INT[api.loadingType] ?? DoorDirection.Rear,
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
  description?: string | null;
  plateNumber: string;
  internalLength: number;
  internalWidth: number;
  internalHeight: number;
  maxWeightCapacity: number;
  layerCount: number;
  loadingType: number;
  isActive?: boolean;
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
    description: values.description?.trim() || null,
    plateNumber: values.plate?.trim() ?? values.serialNumber?.trim() ?? '',
    internalLength: values.length,
    internalWidth: values.width,
    internalHeight: values.height,
    maxWeightCapacity: values.maxCargoWeight,
    layerCount: values.maxLayerCount ?? 0,
    loadingType: LOADING_TYPE_INT[values.doorDirection],
    isActive: values.isActive ?? true,
    kingPinDistanceMm: values.kingpin?.distance ?? null,
    kingPinTareWeightKg: values.kingpin?.tareWeight ?? null,
    kingPinMaxLoadKg: values.kingpin?.maxLoad ?? null,
    mainAxleDistanceMm: values.axleB?.distance ?? null,
    mainAxleTareWeightKg: values.axleB?.tareWeight ?? null,
    mainAxleMaxLoadKg: values.axleB?.maxLoad ?? null,
    additionalAxleDistanceMm: values.axles?.[0]?.distance ?? null,
    additionalAxleTareWeightKg: values.axles?.[0]?.tareWeight ?? null,
    additionalAxleMaxLoadKg: values.axles?.[0]?.maxLoad ?? null,
  };
}

export function buildUpdateVehiclePayload(
  id: string,
  values: VehicleFormValues,
): CreateVehicleRequest & { id: string } {
  return { id, ...buildCreateVehiclePayload(values) };
}
