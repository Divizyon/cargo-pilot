import { z } from 'zod';
import { ProductType, type Item } from '@/lib/types/item';

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
  productType: z.enum([ProductType.Koli, ProductType.Varil, ProductType.Palet]).optional(),
});

export type PlacementWithDimensions = z.infer<typeof placementWithDimensionsSchema>;

export const UnfitReason = {
  Volume: 'volume',
  Weight: 'weight',
  Stacking: 'stacking',
} as const;

export type UnfitReason = (typeof UnfitReason)[keyof typeof UnfitReason];

export interface UnfitItem {
  item: Item;
  quantity: number;
  reason: UnfitReason;
}

export const OptimizationCriteria = {
  Lifo: 0,
  WeightBalance: 1,
  VolumeFirst: 2,
} as const;

export type OptimizationCriteria = (typeof OptimizationCriteria)[keyof typeof OptimizationCriteria];

export const PlanStatus = {
  Taslak: 'taslak',
  Aktif: 'aktif',
  Tamamlandi: 'tamamlandi',
  Iptal: 'iptal',
} as const;

export type PlanStatus = (typeof PlanStatus)[keyof typeof PlanStatus];

export const loadingPlanListItemSchema = z.object({
  id: z.string().uuid(),
  planCode: z.string(),
  planName: z.string(),
  vehicleId: z.string().uuid(),
  vehicleName: z.string(),
  vehiclePlate: z.string().optional(),
  createdAt: z.string(),
  plannedAt: z.string().optional(),
  status: z.enum(['taslak', 'aktif', 'tamamlandi', 'iptal']),
  productCount: z.number().int().nonnegative(),
  totalWeightKg: z.number().nonnegative(),
  vehicleCapacityKg: z.number().positive(),
  fillPercentage: z.number().min(0),
  volumeFillPercentage: z.number().min(0),
  interiorWidthM: z.number().positive(),
  interiorHeightM: z.number().positive(),
  interiorDepthM: z.number().positive(),
  vehicleType: z.enum(['Tir', 'Kamyon', 'Kamposet', 'Konteyner']).optional(),
  doorDirection: z.enum(['rear', 'side', 'top', 'rearAndSide']).optional(),
  doorSide: z.enum(['right', 'left']).optional(),
});

export type LoadingPlanListItem = z.infer<typeof loadingPlanListItemSchema>;

// ─── Plan product constraint types ────────────────────────────────────────────

export const ConstraintType = {
  Fragile: 'fragile',
  Liquid: 'liquid',
  BottomOnly: 'bottom_only',
  NoRotate: 'no_rotate',
  HeavySide: 'heavy_side',
  Hazmat: 'hazmat',
} as const;

export type ConstraintType = (typeof ConstraintType)[keyof typeof ConstraintType];

export const constraintTypeSchema = z.enum([
  'fragile',
  'liquid',
  'bottom_only',
  'no_rotate',
  'heavy_side',
  'hazmat',
]);

export const planProductItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitWeightKg: z.number().nonnegative(),
  layerCount: z.number().int().min(1),
  constraints: z.array(constraintTypeSchema),
});

export type PlanProductItem = z.infer<typeof planProductItemSchema>;

export const planProductGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  products: z.array(planProductItemSchema),
});

export type PlanProductGroup = z.infer<typeof planProductGroupSchema>;
