import { z } from 'zod';
import type { Item } from '@/lib/types/item';

export const itemApiSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  width: z.number(),
  height: z.number(),
  length: z.number(),
  weight: z.number(),
  fragilityType: z.number().int(),
  isStackable: z.boolean(),
  maxStackCount: z.number().int(),
  allowedRotations: z.number().int(),
  maxWeightOnTop: z.number().nullable().optional(),
  stackGroup: z.string().nullable().optional(),
  incompatibleGroups: z.array(z.string()).optional(),
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

export function fromApiItem(api: ItemApi): Item {
  return {
    id: api.id,
    name: api.name,
    sku: api.sku,
    width: api.width,
    height: api.height,
    length: api.length,
    weight: api.weight,
    fragility: api.fragilityType,
    isStackable: api.isStackable,
    maxStackCount: api.maxStackCount,
    maxWeightOnTop: api.maxWeightOnTop ?? null,
    allowedRotations: api.allowedRotations,
    stackGroup: api.stackGroup ?? null,
    incompatibleGroups: api.incompatibleGroups ?? [],
  };
}
