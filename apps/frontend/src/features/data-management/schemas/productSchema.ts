import { z } from 'zod';

export const FRAGILITY_LEVELS = {
  NonFragile: 0,
  Fragile: 1,
  Liquid: 2,
  Corrosive: 3,
  OdorSensitive: 4,
  FoodContact: 5,
  Dry: 6,
  Chemical: 7,
} as const;

export type FragilityLevel = (typeof FRAGILITY_LEVELS)[keyof typeof FRAGILITY_LEVELS];

export const PRODUCT_TYPES = ['koli', 'varil', 'palet'] as const;
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

export const NOTES_MAX_LENGTH = 1000;
export const NOTES_PREVIEW_LENGTH = 50;

export const LOAD_CATEGORIES = ['Gıda', 'Kimya', 'Genel', 'Tehlikeli Madde'] as const;
export type LoadCategory = (typeof LOAD_CATEGORIES)[number];

const numField = (msgKey: string) => z.number({ message: msgKey }).positive(msgKey);

const DIMENSION_ENUM = Object.keys(DIMENSION_UNITS) as [DimensionUnitKey, ...DimensionUnitKey[]];
const WEIGHT_ENUM = Object.keys(WEIGHT_UNITS) as [WeightUnitKey, ...WeightUnitKey[]];

// Maximum allowable values in cm / kg (standard heavy-cargo limits)
const MAX_DIM_CM = 2000;
const MAX_WEIGHT_KG = 50_000;

export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1, 'validations.product.skuRequired'),
    productType: z.enum(PRODUCT_TYPES, { message: 'validations.product.typeRequired' }),
    width: numField('validations.product.widthPositive'),
    widthUnit: z.enum(DIMENSION_ENUM),
    height: numField('validations.product.heightPositive'),
    heightUnit: z.enum(DIMENSION_ENUM),
    length: numField('validations.product.lengthPositive'),
    lengthUnit: z.enum(DIMENSION_ENUM),
    weight: numField('validations.product.weightPositive'),
    weightUnit: z.enum(WEIGHT_ENUM),
    fragilityTypes: z
      .array(z.number().int().min(0).max(9))
      .min(1, 'validations.product.fragilityRequired'),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1, 'validations.product.maxStackMin').optional(),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
    notes: z.string().max(NOTES_MAX_LENGTH, 'validations.product.notesTooLong').optional(),
    loadCategory: z.enum(LOAD_CATEGORIES).optional(),
    incompatibleLoadGroups: z.array(z.enum(LOAD_CATEGORIES)).optional(),
  })
  .refine((data) => !data.isStackable || data.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  })
  .superRefine((data, ctx) => {
    const wCm = toCentimeters(data.width, data.widthUnit);
    const hCm = toCentimeters(data.height, data.heightUnit);
    const lCm = toCentimeters(data.length, data.lengthUnit);
    if (wCm > MAX_DIM_CM)
      ctx.addIssue({
        code: 'custom',
        path: ['width'],
        message: 'validations.product.widthTooLarge',
      });
    if (hCm > MAX_DIM_CM)
      ctx.addIssue({
        code: 'custom',
        path: ['height'],
        message: 'validations.product.heightTooLarge',
      });
    if (lCm > MAX_DIM_CM)
      ctx.addIssue({
        code: 'custom',
        path: ['length'],
        message: 'validations.product.lengthTooLarge',
      });
    if (data.weight > MAX_WEIGHT_KG)
      ctx.addIssue({
        code: 'custom',
        path: ['weight'],
        message: 'validations.product.weightTooLarge',
      });
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

const TO_KG: Record<WeightUnitKey, number> = {
  kg: 1,
  g: 0.001,
  lb: 0.45359237,
};

export function toKilograms(value: number, unit: WeightUnitKey): number {
  return value * TO_KG[unit];
}
