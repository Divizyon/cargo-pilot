import { z } from 'zod';

/** CargoPilot.Application/Common/Optimization/OptimizationLimits.cs → MaxTotalBoxCount */
export const MAX_TOTAL_BOX_COUNT = 500;

const planItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  groupId: z.string().uuid().optional(),
});

/**
 * CreatePlanCommandValidator.cs:31-57 aynası — clientGroupId ve unloadingOrder
 * benzersiz olmak zorunda, unloadingOrder > 0.
 */
const planGroupSchema = z.object({
  clientGroupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  color: z.string().max(50),
  unloadingOrder: z.number().int().positive(),
});

export const algorithmTestRequestSchema = z
  .object({
    vehicleId: z.string().uuid('Araç seçimi zorunludur'),
    items: z.array(planItemSchema).min(1, 'En az bir ürün seçilmelidir'),
    optimizationCriteria: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    clusterGroups: z.boolean().default(true),
    groups: z.array(planGroupSchema).optional(),
  })
  .refine(
    (value) => value.items.reduce((sum, item) => sum + item.quantity, 0) <= MAX_TOTAL_BOX_COUNT,
    { message: `Toplam kutu sayısı ${MAX_TOTAL_BOX_COUNT} sınırını aşamaz`, path: ['items'] },
  )
  .refine(
    (value) => {
      const orders = (value.groups ?? []).map((g) => g.unloadingOrder);
      return new Set(orders).size === orders.length;
    },
    { message: 'Grupların boşaltılma sırası benzersiz olmalıdır', path: ['groups'] },
  );

export type AlgorithmTestRequest = z.infer<typeof algorithmTestRequestSchema>;
