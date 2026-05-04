import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { axiosInstance } from './axiosInstance';

const rotationDtoSchema = z.object({
  l: z.number(),
  w: z.number(),
  h: z.number(),
});

const placementDtoSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation: rotationDtoSchema,
});

const cgFinalDtoSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  deviationX: z.number(),
  deviationY: z.number(),
});

const packingWarningDtoSchema = z.object({
  itemId: z.string(),
  deltaX: z.number(),
  deltaY: z.number(),
  message: z.string(),
});

const unplacedItemDtoSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  reason: z.string(),
});

const packingResultDtoSchema = z.object({
  placements: z.array(placementDtoSchema),
  cgFinal: cgFinalDtoSchema,
  totalWeight: z.number(),
  fillRatePercent: z.number(),
  placedCount: z.number(),
  unplacedCount: z.number(),
  warnings: z.array(packingWarningDtoSchema),
  unplacedItems: z.array(unplacedItemDtoSchema),
  elapsedMilliseconds: z.number(),
});

const apiResultSchema = z.object({
  isSuccess: z.boolean(),
  data: packingResultDtoSchema.nullable(),
  error: z.unknown().nullable().optional(),
});

export type PackingResultDto = z.infer<typeof packingResultDtoSchema>;

export function usePackingMockOptimize() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post<unknown>('/api/packing/optimize/mock');
      const envelope = apiResultSchema.safeParse(data);
      if (!envelope.success) {
        throw new Error(
          `[API] Response parse error:\n${envelope.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`,
        );
      }
      if (!envelope.data.isSuccess || !envelope.data.data) {
        throw new Error('[API] Packing optimization failed');
      }
      return envelope.data.data;
    },
  });
}
