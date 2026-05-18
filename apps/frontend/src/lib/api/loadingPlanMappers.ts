import { z } from 'zod';
import type {
  LoadingPlanListItem,
  PlanProductGroup,
  PlanProductItem,
  PlacementWithDimensions,
} from '@/lib/types/loadingPlan';
import type { Item } from '@/lib/types/item';
import type { Vehicle } from '@/lib/types/vehicle';
import { VehicleType, DoorDirection } from '@/lib/types/vehicle';
import { VEHICLE_TYPE_FROM_INT, LOADING_TYPE_FROM_INT } from './vehicleMappers';
import { type OrientationIndex } from '@/lib/utils/boxOrientations';
import { resolveProductColor } from '@/lib/config/productColors';

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
  const d = parsed.data;
  if (Array.isArray(d)) {
    return { rawItems: d, totalCount: d.length };
  }
  const rawItems =
    (d.items as unknown[] | undefined) ??
    (d.loadingPlans as unknown[] | undefined) ??
    (d.plans as unknown[] | undefined) ??
    [];
  const totalCount =
    (d.totalCount as number | undefined) ??
    (d.total as number | undefined) ??
    (d.count as number | undefined) ??
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
                  imageUrl: z.string().nullable().optional(),
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
    if (s === 'completed' || s === 'tamamlandi' || s === 'done') return 'tamamlandi';
    if (s === 'active' || s === 'aktif' || s === 'processing' || s === 'optimizing') return 'aktif';
    if (s === 'cancelled' || s === 'canceled' || s === 'iptal' || s === 'failed') return 'iptal';
    return 'taslak';
  }
  switch (raw) {
    case 1:
      return 'aktif';
    case 2:
      return 'tamamlandi';
    case 3:
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
      | string
      | undefined;
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
//   0=NoRotation(W,H,L)  1=Yaw(L,H,W)  2=Pitch(W,L,H)
//   3=Roll(H,W,L)        4=YawPitch(H,L,W)  5=RollYaw(L,W,H)
// We store placed dims directly and orientationIndex=0 so rendering needs no further rotation.

function placedDimensions(
  w: number,
  h: number,
  l: number,
  rotation: number,
): { pw: number; ph: number; pd: number } {
  switch (rotation) {
    case 1:
      return { pw: l, ph: h, pd: w }; // Yaw
    case 2:
      return { pw: w, ph: l, pd: h }; // Pitch
    case 3:
      return { pw: h, ph: w, pd: l }; // Roll
    case 4:
      return { pw: h, ph: l, pd: w }; // YawPitch
    case 5:
      return { pw: l, ph: w, pd: h }; // RollYaw
    default:
      return { pw: w, ph: h, pd: l }; // NoRotation
  }
}

export function fromApiPlacementsToScene(
  rawPlacements: PlacementItemApi[],
  colorMap?: Record<string, string>,
): PlacementWithDimensions[] {
  return rawPlacements.flatMap((p) => {
    const raw = p as Record<string, unknown>;
    const itemId = (raw.itemId as string | undefined) ?? (raw.id as string | undefined) ?? '';
    if (!itemId) return [];

    const posX = Number(raw.positionX ?? 0);
    const posY = Number(raw.positionY ?? 0);
    const posZ = Number(raw.positionZ ?? 0);
    const rotation = Number(raw.rotation ?? 0);

    const item = (raw.item ?? {}) as Record<string, unknown>;
    const origW = Number(item.width ?? 0);
    const origH = Number(item.height ?? 0);
    const origL = Number(item.length ?? 0);
    const weight = Number(item.weight ?? item.unitWeight ?? 0);
    const sku = String(item.sku ?? item.sKU ?? item.SKU ?? itemId);

    if (origW <= 0 || origH <= 0 || origL <= 0) return [];

    const { pw, ph, pd } = placedDimensions(origW, origH, origL, rotation);

    const rawType = (item.productType as string | undefined)?.toLowerCase();
    const productType = rawType === 'varil' ? 'varil' : rawType === 'palet' ? 'palet' : 'koli';

    const groupName = (item.groupName ?? item.categoryName ?? item.category) as string | undefined;
    const color = colorMap?.[sku] ?? resolveProductColor(productType, groupName);

    return [
      {
        itemId,
        positionX: posX,
        positionY: posY,
        positionZ: posZ,
        orientationIndex: 0,
        layer: posY === 0 ? 1 : Math.ceil(posY / ph) + 1,
        isViolation: false,
        width: pw,
        height: ph,
        depth: pd,
        weight,
        color,
        productType,
      } satisfies PlacementWithDimensions,
    ];
  });
}

// ─── Mapper: API item → LoadingPlanListItem ───────────────────────────────────

export function fromApiPlanListItem(api: PlanListApiItem): LoadingPlanListItem {
  const v = api.vehicle;
  const raw = api as Record<string, unknown>;
  const planName = api.planName ?? (raw['name'] as string | undefined) ?? '—';
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
  const createdAt = api.createdAt ?? api.createdAtUtc ?? new Date(0).toISOString();
  const loadingType = v?.loadingType ?? null;
  return {
    id: api.id,
    planCode: api.planCode ?? `PLN-${api.id.slice(0, 8).toUpperCase()}`,
    planName,
    vehicleId: api.vehicleId ?? v?.id ?? '',
    vehicleName:
      v?.vehicleName ??
      v?.name ??
      api.vehicleName ??
      (raw['vehicle_name'] as string | undefined) ??
      '—',
    vehiclePlate:
      (v?.plateNumber ??
        v?.plate ??
        (raw['plateNumber'] as string | undefined) ??
        (raw['plate'] as string | undefined)) ||
      undefined,
    createdAt,
    plannedAt: api.plannedAt ?? undefined,
    status: mapStatus(api.status, api.optimizationStatus),
    productCount: itemCount,
    totalWeightKg: totalWeight,
    vehicleCapacityKg: v?.maxWeightCapacity ?? 1,
    fillPercentage: Math.round((api.fillRate ?? 0) * 100),
    volumeFillPercentage: Math.round((api.volumeFillRate ?? api.fillRate ?? 0) * 100),
    interiorWidthM: v?.internalWidth ?? 0,
    interiorHeightM: v?.internalHeight ?? 0,
    interiorDepthM: v?.internalLength ?? 0,
    vehicleType: v?.vehicleType != null ? VEHICLE_TYPE_FROM_INT[v.vehicleType] : undefined,
    doorDirection: loadingType != null ? LOADING_TYPE_FROM_INT[loadingType]?.direction : undefined,
    doorSide: loadingType != null ? LOADING_TYPE_FROM_INT[loadingType]?.doorSide : undefined,
    thumbnailUrl: ((api as Record<string, unknown>)['thumbnailUrl'] ??
      (api as Record<string, unknown>)['snapshotUrl'] ??
      (api as Record<string, unknown>)['snapshotImageUrl']) as string | null | undefined,
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
    imageUrl: z.string().nullable().optional(),
    productType: z.string().nullable().optional(),
    constraintIds: z.array(z.number().int()).optional(),
  })
  .passthrough();

const placementFullSchema = z
  .object({
    itemId: z.string(),
    positionX: z.number(),
    positionY: z.number(),
    positionZ: z.number(),
    rotation: z.number().int().min(0).max(5).catch(0),
    stepIndex: z.number().int().nonnegative().optional().catch(undefined),
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

export const planFullDetailApiResponseSchema = z.object({
  isSuccess: z.boolean().optional(),
  data: z
    .object({
      id: z.string().uuid(),
      planName: z.string(),
      vehicle: planVehicleApiSchema,
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
    imageUrl: raw.imageUrl ?? undefined,
    constraintIds: raw.constraintIds ?? [],
  } as Item;
}

export function fromApiFullDetail(
  data: z.infer<typeof planFullDetailApiResponseSchema>['data'],
): PlanFullDetail {
  const v = data.vehicle;

  const vehicle: Vehicle | null = v?.id
    ? {
        id: v.id,
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
        doorDirection:
          v.loadingType != null
            ? (LOADING_TYPE_FROM_INT[v.loadingType]?.direction ?? DoorDirection.Rear)
            : DoorDirection.Rear,
        doorSide:
          v.loadingType != null ? LOADING_TYPE_FROM_INT[v.loadingType]?.doorSide : undefined,
        isFavorite: false,
        isActive: true,
        isDeleted: false,
        createdAt: new Date(0).toISOString(),
        createdBy: { id: '', fullName: '' },
      }
    : null;

  type InputItemFull = z.infer<typeof inputItemFullSchema>;
  type PlacementFull = z.infer<typeof placementFullSchema>;

  // Build color map from inputItems — renk (productType × yük grubu) kombinasyonuna göre belirlenir
  const skuColorMap: Record<string, string> = {};
  const inputItems = (data.inputItems ?? []).map((ii: InputItemFull) => {
    const item = apiItemToItem(ii.item);
    if (!skuColorMap[item.sku]) {
      const rawItem = ii.item as Record<string, unknown>;
      const groupName = (rawItem.groupName ?? rawItem.categoryName ?? rawItem.category) as
        | string
        | undefined;
      const productType = (rawItem.productType as string | undefined) ?? item.productType;
      skuColorMap[item.sku] = resolveProductColor(productType, groupName);
    }
    return { item, quantity: ii.quantity };
  });

  const placements: PlacementWithDimensions[] = (data.placements ?? []).map((p: PlacementFull) => {
    const {
      pw: width,
      ph: height,
      pd: depth,
    } = placedDimensions(p.item.width, p.item.height, p.item.length, p.rotation);
    const itemSku = p.item.sku || p.item.sKU || p.itemId;
    const rawType = p.item.productType?.toLowerCase();
    const productType = rawType === 'varil' ? 'varil' : rawType === 'palet' ? 'palet' : 'koli';
    const rawItem = p.item as Record<string, unknown>;
    const groupName = (rawItem.groupName ?? rawItem.categoryName ?? rawItem.category) as
      | string
      | undefined;
    const color = skuColorMap[itemSku] ?? resolveProductColor(productType, groupName);
    return {
      itemId: p.itemId,
      positionX: p.positionX,
      positionY: p.positionY,
      positionZ: p.positionZ,
      orientationIndex: 0 as OrientationIndex,
      layer: height > 0 ? Math.round(p.positionY / height) + 1 : 1,
      isViolation: false,
      width,
      height,
      depth,
      weight: p.item.weight,
      color,
      productType,
      stepIndex: p.stepIndex,
      itemName: p.item.name,
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

  return { planName, vehicle, inputItems, placements, skuColorMap, unplacedItems, groups };
}
