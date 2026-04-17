import { z } from 'zod';

export const FRAGILITY_LEVELS = {
  NonFragile: 0,
  Fragile: 1,
  Liquid: 2,
} as const;

export type FragilityLevel = (typeof FRAGILITY_LEVELS)[keyof typeof FRAGILITY_LEVELS];

const numField = (msgKey: string) =>
  z.number({ message: msgKey }).positive(msgKey);

export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1, 'validations.product.skuRequired'),
    width: numField('validations.product.widthPositive'),
    height: numField('validations.product.heightPositive'),
    length: numField('validations.product.lengthPositive'),
    weight: numField('validations.product.weightPositive'),
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
