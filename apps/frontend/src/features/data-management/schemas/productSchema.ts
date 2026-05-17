import { z } from 'zod';

export const FRAGILITY_LEVELS = {
  NonFragile: 0,
  Fragile: 1,
  Liquid: 2,
  Flammable: 3,
  Oxidizing: 4,
  Corrosive: 5,
  OdorSensitive: 6,
  FoodContact: 7,
  KeepDry: 8,
  Chemical: 9,
} as const;

export type FragilityLevel = (typeof FRAGILITY_LEVELS)[keyof typeof FRAGILITY_LEVELS];

export const PRODUCT_TYPES = ['koli', 'varil', 'palet'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const DIMENSION_UNITS = {
  cm: 1,
  mm: 2,
} as const;

export type DimensionUnitKey = keyof typeof DIMENSION_UNITS;
export type DimensionUnitId = (typeof DIMENSION_UNITS)[DimensionUnitKey];

export const WEIGHT_UNITS = {
  kg: 1,
  ton: 1000,
} as const;

export type WeightUnitKey = keyof typeof WEIGHT_UNITS;
export type WeightUnitId = (typeof WEIGHT_UNITS)[WeightUnitKey];

export const NOTES_MAX_LENGTH = 1000;
export const NOTES_PREVIEW_LENGTH = 50;

const numField = (msgKey: string) => z.number({ message: msgKey }).positive(msgKey);

export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1, 'validations.product.skuRequired'),
    productType: z.enum(PRODUCT_TYPES, { message: 'validations.product.typeRequired' }),
    width: numField('validations.product.widthPositive'),
    height: numField('validations.product.heightPositive'),
    length: numField('validations.product.lengthPositive'),
    weight: numField('validations.product.weightPositive'),
    fragility: z.number().int().min(0),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1, 'validations.product.maxStackMin').optional(),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
    notes: z.string().max(NOTES_MAX_LENGTH, 'validations.product.notesTooLong').optional(),
    stackGroup: z.string().optional(),
    incompatibleGroups: z.array(z.string()).optional(),
    constraintIds: z.array(z.number().int()).optional(),
  })
  .refine((data) => !data.isStackable || data.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  });

export type ProductFormValues = z.infer<typeof productSchema>;

const TO_CM: Record<DimensionUnitKey, number> = {
  cm: 1,
  mm: 0.1,
};

export function toCentimeters(value: number, unit: DimensionUnitKey): number {
  return value * TO_CM[unit];
}

export function fromCentimeters(cm: number, unit: DimensionUnitKey): number {
  return cm / TO_CM[unit];
}

const TO_KG: Record<WeightUnitKey, number> = {
  kg: 1,
  ton: 1000,
};

export function toKilograms(value: number, unit: WeightUnitKey): number {
  return value * TO_KG[unit];
}

export function fromKilograms(kg: number, unit: WeightUnitKey): number {
  return kg / TO_KG[unit];
}
