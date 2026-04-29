import { z } from 'zod';

// 0: alt yüz · 1: üst yüz · 2: ön yüz · 3: arka yüz · 4: sol yüz · 5: sağ yüz altta.
// Detay: lib/utils/boxOrientations.ts → BOX_ORIENTATIONS
export const orientationIndexSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const placementSchema = z.object({
  itemId: z.string().uuid(),
  positionX: z.number(),
  positionY: z.number(),
  positionZ: z.number(),
  orientationIndex: orientationIndexSchema.default(0),
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

export const placementWithDimensionsSchema = placementSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  weight: z.number().nonnegative().default(0),
  color: z.string().optional(),
});

export type PlacementWithDimensions = z.infer<typeof placementWithDimensionsSchema>;

export const OptimizationCriteria = {
  Weight: 0,
  Volume: 1,
  Balance: 2,
} as const;

export type OptimizationCriteria = (typeof OptimizationCriteria)[keyof typeof OptimizationCriteria];
