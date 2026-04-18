import { z } from 'zod';

export const itemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  sku: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  weight: z.number().positive(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int().min(1),
});

export type Item = z.infer<typeof itemSchema>;
