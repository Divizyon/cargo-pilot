import { z } from 'zod';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import type { Vehicle } from '@/lib/types/vehicle';

// ─── Backend enum maps ────────────────────────────────────────────────────────

export const VEHICLE_TYPE_FROM_API: Record<number, Vehicle['vehicleType']> = {
  0: 'Tir',
  1: 'Kamyon',
  2: 'Konteyner',
  3: 'Romork',
};

export const VEHICLE_TYPE_TO_API: Record<string, number> = {
  Tir: 0,
  Kamyon: 1,
  Konteyner: 2,
  Romork: 3,
};

function fromLoadingType(loadingType: number): {
  doorDirection: Vehicle['doorDirection'];
  doorSide?: 'right' | 'left';
} {
  switch (loadingType) {
    case 1:
      return { doorDirection: 'side', doorSide: 'right' };
    case 2:
      return { doorDirection: 'side', doorSide: 'left' };
    case 3:
      return { doorDirection: 'side' };
    case 4:
      return { doorDirection: 'top' };
    default:
      return { doorDirection: 'rear' };
  }
}

export function toLoadingType(doorDirection: string, doorSide?: string): number {
  if (doorDirection === 'side') {
    if (doorSide === 'right') return 1;
    if (doorSide === 'left') return 2;
    return 3;
  }
  if (doorDirection === 'top') return 4;
  return 0;
}

// ─── Backend response Zod schemas ────────────────────────────────────────────

const auditUserApiSchema = z.object({
  fullName: z.string(),
  email: z.string().nullable().optional(),
});

export const vehicleSummaryApiSchema = z.object({
  id: z.string().uuid(),
  vehicleName: z.string(),
  vehicleType: z.number().int(),
  plateNumber: z.string().nullable().optional(),
  internalWidth: z.number(),
  internalHeight: z.number(),
  internalLength: z.number(),
  maxWeightCapacity: z.number(),
  layerCount: z.number().int(),
  loadingType: z.number().int(),
  volume: z.number().optional(),
  isActive: z.boolean(),
  companyId: z.string().uuid().nullable().optional(),
  lastModifiedBy: auditUserApiSchema.nullable().optional(),
});

export type VehicleSummaryApi = z.infer<typeof vehicleSummaryApiSchema>;

export const paginatedVehiclesApiSchema = z.object({
  data: z.object({
    items: z.array(vehicleSummaryApiSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

export const createVehicleResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z.string().uuid().optional(),
});

// ─── Backend → frontend mapper ────────────────────────────────────────────────

export function fromApiVehicle(api: VehicleSummaryApi): Vehicle {
  const { doorDirection, doorSide } = fromLoadingType(api.loadingType);
  return {
    id: api.id,
    name: api.vehicleName,
    vehicleType: VEHICLE_TYPE_FROM_API[api.vehicleType] ?? 'Kamyon',
    plate: api.plateNumber ?? undefined,
    length: api.internalLength,
    width: api.internalWidth,
    height: api.internalHeight,
    maxCargoWeight: api.maxWeightCapacity,
    maxLayerCount: api.layerCount,
    doorDirection,
    doorSide,
    isFavorite: false,
    isActive: api.isActive,
    isDeleted: false,
    createdBy: api.lastModifiedBy
      ? { id: '', fullName: api.lastModifiedBy.fullName }
      : { id: '', fullName: '' },
  };
}

// ─── Frontend → backend mapper ────────────────────────────────────────────────

export function toCreateVehicleRequest(data: VehicleFormValues) {
  return {
    vehicleName: data.name,
    vehicleType: VEHICLE_TYPE_TO_API[data.vehicleType] ?? 0,
    plateNumber: data.plate ?? data.serialNumber ?? '',
    internalWidth: data.width,
    internalHeight: data.height,
    internalLength: data.length,
    maxWeightCapacity: data.maxCargoWeight,
    layerCount: data.maxLayerCount ?? 1,
    loadingType: toLoadingType(data.doorDirection, data.doorSide),
    kingPinDistanceMm: data.kingpin?.distance ?? null,
    kingPinTareWeightKg: data.kingpin?.tareWeight ?? null,
    kingPinMaxLoadKg: data.kingpin?.maxLoad ?? null,
    mainAxleDistanceMm: data.axleB?.distance ?? null,
    mainAxleTareWeightKg: data.axleB?.tareWeight ?? null,
    mainAxleMaxLoadKg: data.axleB?.maxLoad ?? null,
    additionalAxleDistanceMm: data.axles?.[0]?.distance ?? null,
    additionalAxleTareWeightKg: data.axles?.[0]?.tareWeight ?? null,
    additionalAxleMaxLoadKg: data.axles?.[0]?.maxLoad ?? null,
  };
}
