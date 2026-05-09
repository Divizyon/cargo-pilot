import { z } from 'zod';
import type { LoadingPlanListItem, PlanProductGroup, PlanProductItem } from '@/lib/types/loadingPlan';

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
  })
  .nullable()
  .optional();

// ─── Plan list item ───────────────────────────────────────────────────────────

export const planListApiItemSchema = z
  .object({
    id: z.string(),
    planName: z.string().optional(),
    name: z.string().optional(), // alternative field name
    vehicleId: z.string().nullable().optional(),
    vehicle: planVehicleApiSchema,
    fillRate: z.number().nullable().optional(),
    volumeFillRate: z.number().nullable().optional(),
    optimizationStatus: z.union([z.number().int(), z.string()]).nullable().optional(),
    itemCount: z.number().int().nullable().optional(),
    placementCount: z.number().int().nullable().optional(), // alternative field name
    totalWeight: z.number().nullable().optional(),
    totalWeightKg: z.number().nullable().optional(), // alternative field name
    createdAt: z.string().optional(),
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
      plannedAt: z.string().nullable().optional(),
      planCode: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      placements: z.array(placementItemApiSchema).optional(),
      placementDetails: z.array(placementItemApiSchema).optional(),
      items: z.array(placementItemApiSchema).optional(),
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

const GROUP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

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
  const groupMap = new Map<string, { color: string; entries: Array<{ id: string; p: PlacementItemApi; count: number }> }>();
  let colorIdx = 0;

  for (const [itemId, { p, count }] of itemMap) {
    const item = p.item;
    const groupName =
      item?.groupName ?? item?.categoryName ?? item?.category ?? 'Yük Grubu';
    const groupColor =
      item?.groupColor ?? item?.categoryColor ?? GROUP_COLORS[colorIdx % GROUP_COLORS.length];

    if (!groupMap.has(groupName)) {
      groupMap.set(groupName, { color: groupColor, entries: [] });
      colorIdx++;
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
      if (item?.allowRotateX === false && item?.allowRotateY === false && item?.allowRotateZ === false)
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

// ─── Mapper: API item → LoadingPlanListItem ───────────────────────────────────

export function fromApiPlanListItem(api: PlanListApiItem): LoadingPlanListItem {
  const v = api.vehicle;
  const planName = api.planName ?? ((api as Record<string, unknown>)['name'] as string) ?? '—';
  const itemCount =
    api.itemCount ??
    api.placementCount ??
    ((api as Record<string, unknown>)['itemsCount'] as number | undefined) ??
    0;
  const totalWeight =
    api.totalWeight ??
    api.totalWeightKg ??
    ((api as Record<string, unknown>)['weight'] as number | undefined) ??
    0;
  return {
    id: api.id,
    planCode: api.planCode ?? `PLN-${api.id.slice(0, 8).toUpperCase()}`,
    planName,
    vehicleId: api.vehicleId ?? '',
    vehicleName: v?.vehicleName ?? v?.name ?? '—',
    vehiclePlate: (v?.plateNumber ?? v?.plate) || undefined,
    createdAt: api.createdAt ?? new Date(0).toISOString(),
    plannedAt: api.plannedAt ?? undefined,
    status: mapStatus(api.status, api.optimizationStatus),
    productCount: itemCount,
    totalWeightKg: totalWeight,
    vehicleCapacityKg: v?.maxWeightCapacity ?? 1,
    fillPercentage: Math.round(api.fillRate ?? 0),
    volumeFillPercentage: Math.round(api.volumeFillRate ?? api.fillRate ?? 0),
    interiorWidthM: v?.internalWidth ?? 0,
    interiorHeightM: v?.internalHeight ?? 0,
    interiorDepthM: v?.internalLength ?? 0,
  };
}
