import { z } from 'zod';

export const placementSchema = z.object({
  itemId: z.string().uuid(),
  positionX: z.number(),
  positionY: z.number(),
  positionZ: z.number(),
  rotation: z.number(),
  layer: z.number().int().min(1),
  isViolation: z.boolean(),
});

export const loadingPlanSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string().uuid(),
  createdAt: z.string().datetime(),
  placementDetails: z.array(placementSchema),
});

export type Placement = z.infer<typeof placementSchema>;
export type LoadingPlan = z.infer<typeof loadingPlanSchema>;

export const OptimizationCriteria = {
  Weight: 0,
  Volume: 1,
  Balance: 2,
} as const;

export type OptimizationCriteria = (typeof OptimizationCriteria)[keyof typeof OptimizationCriteria];
