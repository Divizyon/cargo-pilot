import { z } from 'zod';

export const productSchema = z
  .object({
    name: z.string().min(1, 'validations.product.nameRequired'),
    sku: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    length: z.number().positive(),
    weight: z.number().positive(),
    isStackable: z.boolean(),
    maxStackCount: z.number().int().min(1).optional(),
    fragility: z.number().int().min(0).max(2),
    allowRotateX: z.boolean(),
    allowRotateY: z.boolean(),
    allowRotateZ: z.boolean(),
  })
  .refine((data) => !data.isStackable || data.maxStackCount !== undefined, {
    message: 'validations.product.maxStackRequired',
    path: ['maxStackCount'],
  });

export type ProductFormValues = z.infer<typeof productSchema>;
