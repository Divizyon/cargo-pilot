import {
  toCentimeters,
  type ProductFormValues,
  type ProductType,
} from '@/features/data-management/schemas/productSchema';

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
