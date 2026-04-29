import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string(),
  productType: z.enum(['box', 'barrel', 'pallet']).default('box'),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  weight: z.number().positive(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int().min(1),
  maxWeightOnTop: z.number().nonnegative().nullable(),
  // 0 = normal, 1 = kırılgan, 2 = sıvı içerir
  fragility: z.number().int().min(0).max(2).default(0),
  allowRotateX: z.boolean().default(true),
  allowRotateY: z.boolean().default(true),
  allowRotateZ: z.boolean().default(true),
});

export type Item = z.infer<typeof itemSchema>;
