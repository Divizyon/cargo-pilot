import { z } from 'zod';

export const FRAGILITY_LEVELS = {
  NonFragile: 0,
  Fragile: 1,
  Liquid: 2,
} as const;

export type FragilityLevel = (typeof FRAGILITY_LEVELS)[keyof typeof FRAGILITY_LEVELS];

export const PRODUCT_TYPES = ['box', 'barrel', 'pallet'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DIMENSION_UNITS = {
  cm: 1,
  mm: 2,
  m: 3,
  inch: 4,
  ft: 5,
} as const;

export type DimensionUnitKey = keyof typeof DIMENSION_UNITS;
export type DimensionUnitId = (typeof DIMENSION_UNITS)[DimensionUnitKey];

export const WEIGHT_UNITS = {
  kg: 1,
  g: 2,
  lb: 3,
} as const;

export type WeightUnitKey = keyof typeof WEIGHT_UNITS;
export type WeightUnitId = (typeof WEIGHT_UNITS)[WeightUnitKey];

const numField = (msgKey: string) => z.number({ message: msgKey }).positive(msgKey);

export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1, 'validations.product.skuRequired'),
    productType: z.enum(PRODUCT_TYPES, { message: 'validations.product.typeRequired' }),
    width: numField('validations.product.widthPositive'),
    widthUnit: z.enum(Object.keys(DIMENSION_UNITS) as [DimensionUnitKey, ...DimensionUnitKey[]]),
    height: numField('validations.product.heightPositive'),
    heightUnit: z.enum(Object.keys(DIMENSION_UNITS) as [DimensionUnitKey, ...DimensionUnitKey[]]),
    length: numField('validations.product.lengthPositive'),
    lengthUnit: z.enum(Object.keys(DIMENSION_UNITS) as [DimensionUnitKey, ...DimensionUnitKey[]]),
    weight: numField('validations.product.weightPositive'),
    weightUnit: z.enum(Object.keys(WEIGHT_UNITS) as [WeightUnitKey, ...WeightUnitKey[]]),
    fragility: z.number().int().min(0).max(2),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1, 'validations.product.maxStackMin').optional(),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
  })
  .refine((data) => !data.isStackable || data.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  });

export type ProductFormValues = z.infer<typeof productSchema>;

const TO_CM: Record<DimensionUnitKey, number> = {
  cm: 1,
  mm: 0.1,
  m: 100,
  inch: 2.54,
  ft: 30.48,
};

export function toCentimeters(value: number, unit: DimensionUnitKey): number {
  return value * TO_CM[unit];
}
