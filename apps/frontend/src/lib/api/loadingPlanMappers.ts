import { z } from 'zod';
import type {
  LoadingPlanListItem,
  PlanProductGroup,
  PlanProductItem,
  PlacementWithDimensions,
} from '@/lib/types/loadingPlan';
import { ErpExportStatus } from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { VehicleType, vehicleDoorSchema } from '@/lib/types/vehicle';
import { VEHICLE_TYPE_FROM_INT } from './vehicleMappers';
import { type OrientationIndex } from '@/lib/utils/geometry/boxOrientations';
import { resolveProductColor, COLOR_FALLBACK } from '@/lib/config/productColors';

// ─── Vehicle sub-object ───────────────────────────────────────────────────────

const planVehicleApiSchema = z
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
    vehicleType: z.number().int().optional(),
    loadingType: z.number().int().nullable().optional(),
    doors: z.array(vehicleDoorSchema).optional().nullable(),
  })
  .nullable()
  .optional();

// ─── Plan list item ───────────────────────────────────────────────────────────

export const planListApiItemSchema = z
  .object({
    id: z.string(),
    planName: z.string().optional(),
    name: z.string().optional(),
    vehicleId: z.string().nullable().optional(),
    vehicleName: z.string().optional(),
    vehicle: planVehicleApiSchema,
    fillRate: z.number().nullable().optional(),
    volumeFillRate: z.number().nullable().optional(),
    optimizationStatus: z.union([z.number().int(), z.string()]).nullable().optional(),
    itemCount: z.number().int().nullable().optional(),
    inputTotalQuantity: z.number().int().nullable().optional(),
    placementCount: z.number().int().nullable().optional(),
    totalWeight: z.number().nullable().optional(),
    totalWeightKg: z.number().nullable().optional(),
    createdAt: z.string().optional(),
    createdAtUtc: z.string().optional(),
    plannedAt: z.string().nullable().optional(),
    planCode: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    // Plan detay ucundan gelir: ERP aktarım durumu ve son başarısız denemenin nedeni.
    erpExportStatus: z.number().int().nullable().optional(),
    erpExportMessage: z.string().nullable().optional(),
  })
  .passthrough();

export type PlanListApiItem = z.infer<typeof planListApiItemSchema>;

// ─── Paginated list response ──────────────────────────────────────────────────
// Handles both { data: { items, totalCount } } and { data: { loadingPlans, total } } shapes

const pagedDataSchema = z
  .object({
    items: z.array(z.unknown()).optional(),
    loadingPlans: z.array(z.unknown()).optional(),
    plans: z.array(z.unknown()).optional(),
    totalCount: z.number().int().optional(),
    total: z.number().int().optional(),
    count: z.number().int().optional(),
    page: z.number().int().optional(),
    pageSize: z.number().int().optional(),
  })
  .passthrough();

export const planListApiResponseSchema = z
  .object({
    isSuccess: z.boolean().optional(),
    data: z.union([pagedDataSchema, z.array(z.unknown())]),
  })
  .passthrough();

export type ParsedListResponse = {
  rawItems: unknown[];
  totalCount: number;
};

export function extractListData(
  parsed: z.infer<typeof planListApiResponseSchema>,
): ParsedListResponse {
  const length = parsed.data;
  if (Array.isArray(length)) {
    return { rawItems: length, totalCount: length.length };
  }
  const rawItems =
    (length.items as unknown[] | undefined) ??
    (length.loadingPlans as unknown[] | undefined) ??
    (length.plans as unknown[] | undefined) ??
    [];
  const totalCount =
    (length.totalCount as number | undefined) ??
    (length.total as number | undefined) ??
    (length.count as number | undefined) ??
    rawItems.length;
  return { rawItems, totalCount };
}

// ─── Detail response (GET /api/v1/loading-plans/{id}) ────────────────────────

const placementItemApiSchema = z
  .object({
    id: z.string().optional(),
    itemId: z.string().optional(),
    quantity: z.number().optional(),
    item: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        itemName: z.string().optional(),
        weight: z.number().optional(),
        unitWeight: z.number().optional(),
        weightKg: z.number().optional(),
        category: z.string().nullable().optional(),
        categoryName: z.string().nullable().optional(),
        groupName: z.string().nullable().optional(),
        categoryColor: z.string().nullable().optional(),
        groupColor: z.string().nullable().optional(),
        fragility: z.number().optional(),
        isFragile: z.boolean().optional(),
        isHazmat: z.boolean().optional(),
        isLiquid: z.boolean().optional(),
        allowRotateX: z.boolean().optional(),
        allowRotateY: z.boolean().optional(),
        allowRotateZ: z.boolean().optional(),
        maxStackCount: z.number().optional(),
        layerCount: z.number().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export type PlacementItemApi = z.infer<typeof placementItemApiSchema>;

export const planDetailApiResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z
    .object({
      id: z.string().uuid(),
      planName: z.string(),
      vehicleId: z.string().uuid().optional(),
      vehicle: planVehicleApiSchema,
      fillRate: z.number().nullable().optional(),
      volumeFillRate: z.number().nullable().optional(),
      optimizationStatus: z.union([z.number().int(), z.string()]).nullable().optional(),
      itemCount: z.number().int().nullable().optional(),
      totalWeight: z.number().nullable().optional(),
      createdAt: z.string().optional(),
      createdAtUtc: z.string().optional(),
      plannedAt: z.string().nullable().optional(),
      planCode: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      erpExportStatus: z.number().int().nullable().optional(),
      erpExportMessage: z.string().nullable().optional(),
      placements: z.array(placementItemApiSchema).optional(),
      placementDetails: z.array(placementItemApiSchema).optional(),
      items: z.array(placementItemApiSchema).optional(),
      unplacedItems: z
        .array(
          z
            .object({
              id: z.string().optional(),
              itemId: z.string().optional(),
              quantity: z.number().int(),
              reason: z.number().int().optional(),
              item: z
                .object({
                  name: z.string().optional(),
                })
                .passthrough()
                .nullable()
                .optional(),
            })
            .passthrough(),
        )
        .optional(),
      inputItems: z
        .array(
          z
            .object({
              id: z.string().optional(),
              itemId: z.string().optional(),
              quantity: z.number().int(),
              item: z
                .object({
                  id: z.string().optional(),
                  name: z.string().optional(),
                  sku: z.string().optional(),
                  width: z.number().optional(),
                  height: z.number().optional(),
                  length: z.number().optional(),
                  weight: z.number().optional(),
                })
                .passthrough()
                .nullable()
                .optional(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough(),
});

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStatus(
  rawStatus: string | null | undefined,
  optimizationStatus: string | number | null | undefined,
): LoadingPlanListItem['status'] {
  const raw = rawStatus ?? optimizationStatus;
  if (raw == null) return 'taslak';
  if (typeof raw === 'string') {
    const s = raw.toLowerCase();
    if (s === 'calculated' || s === 'completed' || s === 'tamamlandi' || s === 'done')
      return 'tamamlandi';
    if (s === 'active' || s === 'aktif' || s === 'processing' || s === 'optimizing') return 'aktif';
    if (s === 'failed' || s === 'cancelled' || s === 'canceled' || s === 'iptal') return 'iptal';
    return 'taslak';
  }
  // Backend LoadingPlanOptimizationStatus: Draft=0, Calculated=1, Failed=2
  switch (raw) {
    case 1:
      return 'tamamlandi';
    case 2:
      return 'iptal';
    default:
      return 'taslak';
  }
}

// ─── Mapper: placements → PlanProductGroup[] ─────────────────────────────────

export function fromApiDetailPlacements(rawPlacements: PlacementItemApi[]): PlanProductGroup[] {
  // itemId → { item, count }
  const itemMap = new Map<string, { p: PlacementItemApi; count: number }>();

  for (const p of rawPlacements) {
    const itemId = p.itemId ?? p.id ?? p.item?.id ?? '';
    if (!itemId) continue;
    const existing = itemMap.get(itemId);
    if (existing) {
      existing.count += p.quantity ?? 1;
    } else {
      itemMap.set(itemId, { p, count: p.quantity ?? 1 });
    }
  }

  // group name → items
  const groupMap = new Map<
    string,
    { color: string; entries: Array<{ id: string; p: PlacementItemApi; count: number }> }
  >();
  for (const [itemId, { p, count }] of itemMap) {
    const item = p.item;
    const groupName = item?.groupName ?? item?.categoryName ?? item?.category ?? 'Yük Grubu';
    const rawType = (item as Record<string, unknown> | undefined)?.['productType'] as
      string | undefined;
    const groupColor = resolveProductColor(rawType, groupName);

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, { color: groupColor, entries: [] });
    }
    groupMap.get(groupName)!.entries.push({ id: itemId, p, count });
  }

  const groups: PlanProductGroup[] = [];
  let gIdx = 0;

  for (const [groupName, { color, entries }] of groupMap) {
    const products: PlanProductItem[] = entries.map(({ id, p, count }) => {
      const item = p.item;
      const constraints: PlanProductItem['constraints'] = [];

      const fragility = item?.fragility ?? 0;
      if (fragility >= 1 || item?.isFragile) constraints.push('fragile');
      if (fragility === 2 || item?.isLiquid) constraints.push('liquid');
      if (item?.isHazmat) constraints.push('hazmat');
      if (
        item?.allowRotateX === false &&
        item?.allowRotateY === false &&
        item?.allowRotateZ === false
      )
        constraints.push('no_rotate');

      return {
        id,
        name: item?.name ?? item?.itemName ?? id,
        quantity: count,
        unitWeightKg: item?.weight ?? item?.unitWeight ?? item?.weightKg ?? 0,
        layerCount: item?.layerCount ?? item?.maxStackCount ?? 1,
        constraints,
      };
    });

    groups.push({ id: `grp-${gIdx++}-${groupName}`, name: groupName, color, products });
  }

  return groups;
}

// ─── Mapper: API placements → PlacementWithDimensions[] ─────────────────────
// Backend PlacementDto: { itemId, positionX/Y/Z, rotation(0-5), item: { width, height, length, weight, sku } }
// rotation enum maps to placed dimensions:
//   0=NoRotation(width,height,length)  1=Yaw(length,height,width)
//   2=Pitch(width,length,height)       3=Roll(height,width,length)
//   4=YawPitch(height,length,width)    5=RollYaw(length,width,height)
// We store placed dims directly and orientationIndex=0 so rendering needs no further rotation.

function placedDimensions(
  width: number,
  height: number,
  length: number,
  rotation: number,
): { width: number; height: number; length: number } {
  switch (rotation) {
    case 1:
      return { width: length, height: height, length: width }; // Yaw
    case 2:
      return { width: width, height: length, length: height }; // Pitch
    case 3:
      return { width: height, height: width, length: length }; // Roll
    case 4:
      return { width: height, height: length, length: width }; // YawPitch
    case 5:
      return { width: length, height: width, length: height }; // RollYaw
    default:
      return { width: width, height: height, length: length }; // NoRotation
  }
}

// Backend bazen timezone bilgisi olmadan UTC datetime döndürür (örn: "2026-05-18T21:41:00").
// JavaScript bunu yerel saat olarak parse eder ve hatalı görüntüler. 'Z' ekleyerek UTC garantiliyoruz.
function normalizeUtcDatetime(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(s)) {
    return s + 'Z';
  }
  return s;
}

// ─── Mapper: API item → LoadingPlanListItem ───────────────────────────────────

/** Bilinmeyen bir durum kodu geldiğinde aktarım durumu gösterilmez (uydurma rozet çıkmaz). */
function mapErpExportStatus(raw: number | null | undefined): ErpExportStatus | undefined {
  switch (raw) {
    case ErpExportStatus.Pending:
    case ErpExportStatus.Sent:
    case ErpExportStatus.Failed:
      return raw;
    default:
      return undefined;
  }
}

export function fromApiPlanListItem(api: PlanListApiItem): LoadingPlanListItem {
  const v = api.vehicle;
  const planName = api.planName ?? ((api as Record<string, unknown>)['name'] as string) ?? '—';
  const itemCount =
    api.itemCount ??
    api.inputTotalQuantity ??
    api.placementCount ??
    ((api as Record<string, unknown>)['itemsCount'] as number | undefined) ??
    0;
  const totalWeight =
    api.totalWeight ??
    api.totalWeightKg ??
    ((api as Record<string, unknown>)['weight'] as number | undefined) ??
    0;
  const rawCreatedAt = api.createdAt ?? api.createdAtUtc ?? new Date(0).toISOString();
  const createdAt = normalizeUtcDatetime(rawCreatedAt);
  // Plan detayı ve liste ucu kapı listesini taşıyor (VehicleInPlanDto.Doors).
  // Eski `loadingType` türetimi kayıplıydı: arka + yan kapılı araçta ikinci
  // kapı düşüyordu, o yüzden geri düşme yolu bilinçli olarak kaldırıldı.
  const doors = v?.doors ?? [];
  return {
    id: api.id,
    planCode: api.planCode ?? `PLN-${api.id.slice(0, 8).toUpperCase()}`,
    planName,
    vehicleId: api.vehicleId ?? v?.id ?? '',
    vehicleName: v?.vehicleName ?? v?.name ?? api.vehicleName ?? '—',
    vehiclePlate: (v?.plateNumber ?? v?.plate) || undefined,
    createdAt,
    plannedAt: api.plannedAt ?? undefined,
    status: mapStatus(api.status, api.optimizationStatus),
    productCount: itemCount,
    totalWeightKg: totalWeight,
    vehicleCapacityKg: v?.maxWeightCapacity ?? 1,
    fillPercentage: Math.round((api.fillRate ?? 0) * 100),
    volumeFillPercentage: Math.round((api.volumeFillRate ?? api.fillRate ?? 0) * 100),
    interiorWidthCm: v?.internalWidth ?? 0,
    interiorHeightCm: v?.internalHeight ?? 0,
    interiorLengthCm: v?.internalLength ?? 0,
    vehicleType: v?.vehicleType != null ? VEHICLE_TYPE_FROM_INT[v.vehicleType] : undefined,
    doors,
    thumbnailUrl: (() => {
      const raw = ((api as Record<string, unknown>)['thumbnailUrl'] ??
        (api as Record<string, unknown>)['snapshotUrl'] ??
        (api as Record<string, unknown>)['snapshotImageUrl']) as string | null | undefined;
      if (!raw) return raw;
      // Fix double-protocol (e.g. "http://https://...") → strip outer
      if (/^https?:\/\/https?:\/\//.test(raw)) return raw.replace(/^https?:\/\//, '');
      // Normalize http → https to avoid mixed-content blocks
      return raw.replace(/^http:\/\//, 'https://');
    })(),
    erpExportStatus: mapErpExportStatus(api.erpExportStatus),
    erpExportMessage: api.erpExportMessage ?? undefined,
  };
}

// ─── Full detail schema (3D planner) ─────────────────────────────────────────

const planGroupFullSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    color: z.string(),
    unloadingOrder: z.number().int(),
    isActive: z.boolean().optional(),
    items: z
      .array(z.object({ itemId: z.string() }).passthrough())
      .optional()
      .default([]),
  })
  .passthrough();

const planItemDimensionsSchema = z
  .object({
    id: z.string(),
    sku: z.string().optional(),
    sKU: z.string().optional(), // .NET CamelCase serializes SKU → sKU
    name: z.string().catch(''),
    width: z.number(),
    height: z.number(),
    length: z.number(),
    weight: z.number().catch(0),
    productType: z.string().nullable().optional(),
    constraintIds: z.array(z.number().int()).optional(),
    stackGroup: z.string().nullable().optional(),
    incompatibleGroups: z.array(z.string()).optional(),
  })
  .passthrough();

const placementFullSchema = z
  .object({
    itemId: z.string(),
    vehicleId: z.string().optional(),
    positionX: z.number(),
    positionY: z.number(),
    positionZ: z.number(),
    rotation: z.number().int().min(0).max(5).catch(0),
    item: planItemDimensionsSchema,
  })
  .passthrough();

const inputItemFullSchema = z
  .object({
    itemId: z.string(),
    quantity: z.number().int().min(1).catch(1),
    item: planItemDimensionsSchema,
  })
  .passthrough();

const planVehicleInPlanSchema = z
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
    vehicleType: z.number().int().optional(),
    loadingType: z.number().int().nullable().optional(),
    doors: z.array(vehicleDoorSchema).optional().nullable(),
    vehicleId: z.string().uuid().optional(),
    sortOrder: z.number().int().optional(),
  })
  .passthrough();

export const planFullDetailApiResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z
    .object({
      id: z.string().uuid(),
      planName: z.string(),
      vehicle: planVehicleApiSchema,
      vehicles: z.array(planVehicleInPlanSchema).optional().default([]),
      placements: z.array(placementFullSchema).optional().default([]),
      inputItems: z.array(inputItemFullSchema).optional().default([]),
      groups: z.array(planGroupFullSchema).optional().default([]),
      unplacedItems: z
        .array(
          z
            .object({
              id: z.string().optional(),
              itemId: z.string().optional(),
              quantity: z.number().int(),
              reason: z.number().int().optional(),
              item: z.object({ name: z.string().optional() }).passthrough().nullable().optional(),
            })
            .passthrough(),
        )
        .optional()
        .default([]),
    })
    .passthrough(),
});

export type PlanFullDetail = {
  planName: string;
  vehicle: Vehicle | null;
  vehicles: Vehicle[];
  inputItems: Array<{ item: Item; quantity: number }>;
  placements: PlacementWithDimensions[];
  skuColorMap: Record<string, string>;
  unplacedItems: Array<{ itemId: string; quantity: number; reason: number; name: string }>;
  groups: Array<{ id: string; name: string; color: string; itemIds: string[] }>;
};

function apiItemToItem(raw: z.infer<typeof planItemDimensionsSchema>): Item {
  return {
    id: raw.id,
    name: raw.name,
    sku: raw.sku || raw.sKU || raw.id,
    productType: 'koli',
    width: raw.width,
    height: raw.height,
    length: raw.length,
    weight: raw.weight,
    isStackable: true,
    maxStackCount: 1,
    maxWeightOnTop: null,
    fragility: 0,
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    allowFaceBottom: true,
    allowFaceTop: true,
    allowFaceFront: true,
    allowFaceBack: true,
    allowFaceLeft: true,
    allowFaceRight: true,
    constraintIds: raw.constraintIds ?? [],
    stackGroup: raw.stackGroup ?? null,
    incompatibleGroups: raw.incompatibleGroups ?? [],
    specialNotes: null,
    erpProviderName: null,
  } as Item;
}

function apiVehicleToVehicle(
  v: z.infer<typeof planVehicleApiSchema> & { vehicleId?: string },
): Vehicle {
  const id = v.vehicleId ?? v.id ?? '';
  const doors = v.doors ?? [];
  return {
    id,
    name: v.vehicleName ?? v.name ?? '—',
    plate: v.plateNumber ?? v.plate ?? '',
    width: v.internalWidth ?? 0,
    height: v.internalHeight ?? 0,
    length: v.internalLength ?? 0,
    maxCargoWeight: v.maxWeightCapacity ?? 0,
    vehicleType:
      v.vehicleType != null
        ? (VEHICLE_TYPE_FROM_INT[v.vehicleType] ?? VehicleType.Tir)
        : VehicleType.Tir,
    doors,
    isFavorite: false,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(0).toISOString(),
    createdBy: { id: '', fullName: '' },
  };
}

export function fromApiFullDetail(
  data: z.infer<typeof planFullDetailApiResponseSchema>['data'],
): PlanFullDetail {
  // Multi-vehicle: prefer data.vehicles[], fall back to data.vehicle
  const rawVehicles = data.vehicles ?? [];
  const vehicles: Vehicle[] =
    rawVehicles.length > 0
      ? rawVehicles.map((v) =>
          apiVehicleToVehicle(v as z.infer<typeof planVehicleApiSchema> & { vehicleId?: string }),
        )
      : data.vehicle?.id
        ? [apiVehicleToVehicle(data.vehicle)]
        : [];

  const vehicle: Vehicle | null = vehicles[0] ?? null;

  type InputItemFull = z.infer<typeof inputItemFullSchema>;
  type PlacementFull = z.infer<typeof placementFullSchema>;

  // Build color map — inputItems öncelikli, eksik SKU'lar placements'tan tamamlanır
  const skuColorMap: Record<string, string> = {};

  function resolveSkuColor(rawItem: Record<string, unknown>, productType: string): string {
    const groupName = (rawItem.groupName ?? rawItem.categoryName ?? rawItem.category) as
      string | undefined;
    return resolveProductColor(productType, groupName);
  }

  const inputItems = (data.inputItems ?? []).map((ii: InputItemFull) => {
    const item = apiItemToItem(ii.item);
    if (!skuColorMap[item.sku]) {
      const rawItem = ii.item as Record<string, unknown>;
      const productType = (rawItem.productType as string | undefined) ?? item.productType;
      const color = resolveSkuColor(rawItem, productType);
      if (color !== COLOR_FALLBACK) {
        skuColorMap[item.sku] = color;
      }
    }
    return { item, quantity: ii.quantity };
  });

  // inputItems'da grubu olmayan SKU'ları placements'tan tamamla
  for (const p of data.placements ?? []) {
    const itemSku = p.item.sku || p.item.sKU || p.itemId;
    if (skuColorMap[itemSku]) continue;
    const rawItem = p.item as Record<string, unknown>;
    const rawType = p.item.productType?.toLowerCase();
    const productType = rawType === 'varil' ? 'varil' : rawType === 'palet' ? 'palet' : 'koli';
    const color = resolveSkuColor(rawItem, productType);
    if (color !== COLOR_FALLBACK) {
      skuColorMap[itemSku] = color;
    }
  }

  const placements: PlacementWithDimensions[] = (data.placements ?? []).map((p: PlacementFull) => {
    const { width, height, length } = placedDimensions(
      p.item.width,
      p.item.height,
      p.item.length,
      p.rotation,
    );
    const itemSku = p.item.sku || p.item.sKU || p.itemId;
    const rawType = p.item.productType?.toLowerCase();
    const productType = rawType === 'varil' ? 'varil' : rawType === 'palet' ? 'palet' : 'koli';
    const rawItem = p.item as Record<string, unknown>;
    // skuColorMap'te varsa kullan, yoksa placement'ın kendi item verisinden türet
    const color = skuColorMap[itemSku] ?? resolveSkuColor(rawItem, productType);
    return {
      itemId: p.itemId,
      vehicleId: p.vehicleId,
      positionX: p.positionX,
      positionY: p.positionY,
      positionZ: p.positionZ,
      orientationIndex: 0 as OrientationIndex,
      layer: height > 0 ? Math.round(p.positionY / height) + 1 : 1,
      isViolation: false,
      width,
      height,
      length,
      weight: p.item.weight,
      color,
      productType,
    };
  });

  const planName = data.planName ?? '—';
  type RawUnplaced = {
    id?: string;
    itemId?: string;
    quantity: number;
    reason?: number;
    item?: { name?: string } | null;
  };
  const unplacedItems = (data.unplacedItems ?? []).map((u: RawUnplaced) => ({
    itemId: u.itemId ?? u.id ?? '',
    quantity: u.quantity,
    reason: u.reason ?? 0,
    name: u.item?.name ?? '',
  }));

  // Grupları UnloadingOrder ASC sıraya göre al — idx+1 ile unloadingOrder yeniden üretilir
  type RawGroup = z.infer<typeof planGroupFullSchema>;
  const groups = [...(data.groups ?? [])]
    .sort((a: RawGroup, b: RawGroup) => a.unloadingOrder - b.unloadingOrder)
    .map((g: RawGroup) => ({
      id: g.id,
      dbId: g.id,
      name: g.name,
      color: g.color,
      itemIds: (g.items ?? []).map((i: { itemId: string }) => i.itemId),
    }));

  return {
    planName,
    vehicle,
    vehicles,
    inputItems,
    placements,
    skuColorMap,
    unplacedItems,
    groups,
  };
}
