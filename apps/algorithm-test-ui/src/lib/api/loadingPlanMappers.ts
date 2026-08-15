import { z } from 'zod';
import type { Placement } from '@/lib/types/loadingPlan';
import type { Vehicle } from '@/lib/types/vehicle';
import { resolveDoorDirection } from './vehicleMappers';

// ─── GET /api/v1/loading-plans/{id} şeması ────────────────────────────────────
// Karşılığı: CargoPilot.Application/Features/Plans/GetPlanById/PlanDetailDto.cs

const planVehicleSchema = z
  .object({
    id: z.string().uuid().optional(),
    vehicleName: z.string().optional(),
    name: z.string().optional(),
    plateNumber: z.string().nullable().optional(),
    plate: z.string().nullable().optional(),
    internalWidth: z.number().optional(),
    internalHeight: z.number().optional(),
    internalLength: z.number().optional(),
    maxWeightCapacity: z.number().optional(),
    loadingType: z.number().int().nullable().optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const planItemSchema = z
  .object({
    id: z.string(),
    name: z.string().catch(''),
    width: z.number(),
    height: z.number(),
    length: z.number(),
    weight: z.number().catch(0),
  })
  .passthrough();

const placementSchema = z
  .object({
    itemId: z.string(),
    positionX: z.number(),
    positionY: z.number(),
    positionZ: z.number(),
    rotation: z.number().int().min(0).max(5).catch(0),
    item: planItemSchema,
  })
  .passthrough();

const inputItemSchema = z
  .object({
    itemId: z.string(),
    quantity: z.number().int().min(1).catch(1),
    item: planItemSchema,
  })
  .passthrough();

const unplacedItemSchema = z
  .object({
    id: z.string().optional(),
    itemId: z.string().optional(),
    quantity: z.number().int(),
    reason: z.number().int().optional(),
    item: z.object({ name: z.string().optional() }).passthrough().nullable().optional(),
  })
  .passthrough();

const nullableNumber = z.number().nullable().optional();

export const planDetailResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z
    .object({
      id: z.string().uuid(),
      planName: z.string(),
      vehicle: planVehicleSchema,
      placements: z.array(placementSchema).optional().default([]),
      inputItems: z.array(inputItemSchema).optional().default([]),
      unplacedItems: z.array(unplacedItemSchema).optional().default([]),
      // Motorun kendi ürettiği metrikler — istemci hesabıyla çapraz kontrol için.
      fillRate: nullableNumber,
      totalWeight: nullableNumber,
      placedQuantity: nullableNumber,
      unplacedQuantity: nullableNumber,
      centerOfGravityX: nullableNumber,
      centerOfGravityY: nullableNumber,
      centerOfGravityZ: nullableNumber,
      weightBalanceOffsetX: nullableNumber,
      weightBalanceOffsetZ: nullableNumber,
    })
    .passthrough(),
});

/** Backend'in hesaplayıp döndürdüğü metrikler. `fillRate` 0–1 kesir olarak gelir. */
export interface BackendPlanMetrics {
  fillRate: number | null;
  totalWeight: number | null;
  placedQuantity: number | null;
  unplacedQuantity: number | null;
  centerOfGravityX: number | null;
  centerOfGravityY: number | null;
  centerOfGravityZ: number | null;
  weightBalanceOffsetX: number | null;
  weightBalanceOffsetZ: number | null;
}

export interface PlanDetail {
  vehicle: Vehicle | null;
  placements: Placement[];
  itemNamesById: Map<string, string>;
  unplacedItems: Array<{ itemId: string; quantity: number; reason: number; name: string }>;
  metrics: BackendPlanMetrics;
}

// ─── Rotasyon → yerleşmiş kenar uzunlukları ───────────────────────────────────
// CargoPilot.Domain/Enums/LoadingPlanPlacementRotation.cs:
//   0=NoRotation(W,H,L)  1=Yaw(L,H,W)     2=Pitch(W,L,H)
//   3=Roll(H,W,L)        4=YawPitch(H,L,W) 5=RollYaw(L,W,H)
// Motor gerçek kenarları hesaplıyor ama LoadingPlanRepository bunları kaydetmiyor
// (yalnız rotasyon enum'u saklanıyor), bu yüzden istemci tarafında yeniden türetiyoruz.
function placedDimensions(
  w: number,
  h: number,
  l: number,
  rotation: number,
): { width: number; height: number; depth: number } {
  switch (rotation) {
    case 1:
      return { width: l, height: h, depth: w };
    case 2:
      return { width: w, height: l, depth: h };
    case 3:
      return { width: h, height: w, depth: l };
    case 4:
      return { width: h, height: l, depth: w };
    case 5:
      return { width: l, height: w, depth: h };
    default:
      return { width: w, height: h, depth: l };
  }
}

function toVehicle(raw: NonNullable<z.infer<typeof planVehicleSchema>>): Vehicle {
  return {
    id: raw.id ?? '',
    name: raw.vehicleName ?? raw.name ?? '—',
    plate: raw.plateNumber ?? raw.plate ?? undefined,
    width: raw.internalWidth ?? 0,
    height: raw.internalHeight ?? 0,
    length: raw.internalLength ?? 0,
    maxCargoWeight: raw.maxWeightCapacity ?? 0,
    doorDirection: resolveDoorDirection(raw.loadingType),
  };
}

export function fromApiPlanDetail(
  data: z.infer<typeof planDetailResponseSchema>['data'],
): PlanDetail {
  const vehicle = data.vehicle ? toVehicle(data.vehicle) : null;

  const placements: Placement[] = (data.placements ?? []).map((p) => ({
    itemId: p.itemId,
    positionX: p.positionX,
    positionY: p.positionY,
    positionZ: p.positionZ,
    ...placedDimensions(p.item.width, p.item.height, p.item.length, p.rotation),
    rotation: p.rotation,
    isViolation: false,
  }));

  // Ürün adları hem inputItems'tan hem placements'tan toplanır; ikisi de eksik olabilir.
  const itemNamesById = new Map<string, string>();
  for (const ii of data.inputItems ?? []) {
    if (ii.item.name) itemNamesById.set(ii.itemId, ii.item.name);
  }
  for (const p of data.placements ?? []) {
    if (!itemNamesById.has(p.itemId) && p.item.name) itemNamesById.set(p.itemId, p.item.name);
  }

  const unplacedItems = (data.unplacedItems ?? []).map((u) => ({
    itemId: u.itemId ?? u.id ?? '',
    quantity: u.quantity,
    reason: u.reason ?? 0,
    name: u.item?.name ?? '',
  }));

  return {
    vehicle,
    placements,
    itemNamesById,
    unplacedItems,
    metrics: {
      fillRate: data.fillRate ?? null,
      totalWeight: data.totalWeight ?? null,
      placedQuantity: data.placedQuantity ?? null,
      unplacedQuantity: data.unplacedQuantity ?? null,
      centerOfGravityX: data.centerOfGravityX ?? null,
      centerOfGravityY: data.centerOfGravityY ?? null,
      centerOfGravityZ: data.centerOfGravityZ ?? null,
      weightBalanceOffsetX: data.weightBalanceOffsetX ?? null,
      weightBalanceOffsetZ: data.weightBalanceOffsetZ ?? null,
    },
  };
}
