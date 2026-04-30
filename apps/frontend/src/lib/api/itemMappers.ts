import { z } from 'zod';
import {
  toCentimeters,
  type ProductFormValues,
  type ProductType,
} from '@/features/data-management/schemas/productSchema';
import type { Item } from '@/lib/types/item';

export const ITEM_CATEGORY = {
  Package: 0,
  Pallet: 1,
  Box: 2,
} as const;
export type ItemCategoryValue = (typeof ITEM_CATEGORY)[keyof typeof ITEM_CATEGORY];

export const ALLOWED_ROTATIONS = {
  All: 0,
  NoVertical: 1,
  Fixed: 2,
} as const;
export type AllowedRotationsValue = (typeof ALLOWED_ROTATIONS)[keyof typeof ALLOWED_ROTATIONS];

export interface CreateItemRequest {
  sku: string;
  barcode?: string | null;
  name: string;
  productType: string;
  category: ItemCategoryValue;
  width: number;
  height: number;
  length: number;
  diameter?: number | null;
  weight: number;
  fragilityType: 0 | 1 | 2 | 3 | 4;
  isStackable: boolean;
  maxStackCount: number;
  maxWeightOnTop: number;
  allowedRotations: AllowedRotationsValue;
  imageUrl?: string | null;
  stackGroup?: string | null;
  specialNotes?: string | null;
}

export function toCategory(productType: ProductType): ItemCategoryValue {
  if (productType === 'pallet') return ITEM_CATEGORY.Pallet;
  if (productType === 'box') return ITEM_CATEGORY.Box;
  return ITEM_CATEGORY.Package;
}

export function toAllowedRotations(
  allowRotateX: boolean,
  allowRotateY: boolean,
  allowRotateZ: boolean,
): AllowedRotationsValue {
  if (allowRotateX && allowRotateY && allowRotateZ) return ALLOWED_ROTATIONS.All;
  if (allowRotateX && !allowRotateY && allowRotateZ) return ALLOWED_ROTATIONS.NoVertical;
  return ALLOWED_ROTATIONS.Fixed;
}

export function toMaxWeightOnTop(
  weight: number,
  isStackable: boolean,
  maxStackCount: number,
): number {
  if (!isStackable) return 0;
  const layersAbove = Math.max(maxStackCount - 1, 1);
  return Math.max(weight * layersAbove, 1);
}

// ─── Backend response schema ──────────────────────────────────────────────────

export const itemApiSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  productType: z.string().nullable().optional(),
  category: z.number().int(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  weight: z.number(),
  fragilityType: z.number().int(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int(),
  allowedRotations: z.number().int(),
  barcode: z.string().nullable().optional(),
  diameter: z.number().nullable().optional(),
  maxWeightOnTop: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  stackGroup: z.string().nullable().optional(),
  specialNotes: z.string().nullable().optional(),
});

export type ItemApi = z.infer<typeof itemApiSchema>;

export const paginatedItemsApiSchema = z.object({
  data: z.object({
    items: z.array(itemApiSchema),
    totalCount: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
});

export const itemApiResponseSchema = z.object({
  data: itemApiSchema,
});

// ─── Backend → frontend mappers ───────────────────────────────────────────────

function fromCategory(category: number): 'box' | 'barrel' | 'pallet' {
  if (category === ITEM_CATEGORY.Pallet) return 'pallet';
  if (category === ITEM_CATEGORY.Box) return 'box';
  return 'barrel';
}

function fromAllowedRotations(v: number): {
  allowRotateX: boolean;
  allowRotateY: boolean;
  allowRotateZ: boolean;
} {
  if (v === ALLOWED_ROTATIONS.All)
    return { allowRotateX: true, allowRotateY: true, allowRotateZ: true };
  if (v === ALLOWED_ROTATIONS.NoVertical)
    return { allowRotateX: true, allowRotateY: false, allowRotateZ: true };
  return { allowRotateX: false, allowRotateY: false, allowRotateZ: false };
}

export function fromApiItem(api: ItemApi): Item {
  return {
    id: api.id,
    name: api.name,
    sku: api.sku,
    productType: fromCategory(api.category),
    width: api.width,
    height: api.height,
    length: api.length,
    weight: api.weight,
    fragility: api.fragilityType,
    isStackable: api.isStackable,
    maxStackCount: api.maxStackCount,
    maxWeightOnTop: api.maxWeightOnTop ?? null,
    ...fromAllowedRotations(api.allowedRotations),
  };
}

export function itemToFormValues(item: Item): Partial<ProductFormValues> {
  return {
    name: item.name,
    sku: item.sku,
    productType: item.productType,
    width: item.width,
    widthUnit: 'cm',
    height: item.height,
    heightUnit: 'cm',
    length: item.length,
    lengthUnit: 'cm',
    weight: item.weight,
    weightUnit: 'kg',
    fragility: item.fragility,
    isStackable: item.isStackable,
    maxStackCount: item.maxStackCount,
    allowRotateX: item.allowRotateX,
    allowRotateY: item.allowRotateY,
    allowRotateZ: item.allowRotateZ,
  };
}

export function buildCreateItemPayload(values: ProductFormValues): CreateItemRequest {
  const maxStackCount = values.maxStackCount ?? 1;
  const isStackable = maxStackCount > 1;
  const trimmedNotes = values.notes?.trim();

  return {
    sku: values.sku,
    name: values.name,
    productType: values.productType,
    category: toCategory(values.productType),
    width: toCentimeters(values.width, values.widthUnit),
    height: toCentimeters(values.height, values.heightUnit),
    length: toCentimeters(values.length, values.lengthUnit),
    weight: values.weight,
    fragilityType: values.fragility as 0 | 1 | 2 | 3 | 4,
    isStackable,
    maxStackCount: isStackable ? maxStackCount : 0,
    maxWeightOnTop: toMaxWeightOnTop(values.weight, isStackable, maxStackCount),
    allowedRotations: toAllowedRotations(
      values.allowRotateX,
      values.allowRotateY,
      values.allowRotateZ,
    ),
    specialNotes: trimmedNotes && trimmedNotes.length > 0 ? trimmedNotes : null,
  };
}

export function buildUpdateItemPayload(
  id: string,
  values: ProductFormValues,
): CreateItemRequest & { id: string } {
  return { id, ...buildCreateItemPayload(values) };
}
