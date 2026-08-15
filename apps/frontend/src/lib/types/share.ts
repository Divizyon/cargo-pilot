import { z } from 'zod';

export const ShareValidity = {
  H24: '24h',
  D7: '7d',
  Unlimited: 'unlimited',
} as const;

export type ShareValidity = (typeof ShareValidity)[keyof typeof ShareValidity];

export const shareLinkSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  planName: z.string(),
  token: z.string(),
  validity: z.enum(['24h', '7d', 'unlimited']),
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  isExpired: z.boolean(),
  viewCount: z.number().int().nonnegative(),
});

export type ShareLink = z.infer<typeof shareLinkSchema>;

export const sharePlanSchema = z.object({
  planName: z.string(),
  planCode: z.string(),
  vehicleName: z.string(),
  vehiclePlate: z.string().nullish(),
  createdAt: z.string(),
  plannedAt: z.string().nullish(),
  status: z.enum(['taslak', 'aktif', 'tamamlandi', 'iptal']),
  productCount: z.number().int().nonnegative(),
  totalWeightKg: z.number().nonnegative(),
  vehicleCapacityKg: z.number().positive(),
  fillPercentage: z.number().min(0),
  isExpired: z.boolean(),
  vehicleData: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      vehicleType: z.string().optional(),
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      doorDirection: z.string().optional(),
      maxCargoWeight: z.number().optional(),
    })
    .optional()
    .nullable(),
  placements: z
    .array(
      z.object({
        itemId: z.string(),
        positionX: z.number(),
        positionY: z.number(),
        positionZ: z.number(),
        width: z.number(),
        height: z.number(),
        length: z.number(),
        orientationIndex: z.number().int().min(0).max(5),
        layer: z.number().int().min(0),
        isViolation: z.boolean(),
        color: z.string().nullable().optional(),
        weight: z.number().nonnegative(),
        productName: z.string().optional().nullable(),
        productType: z.union([z.string(), z.number()]).optional().nullable(),
        productSku: z.string().optional().nullable(),
      }),
    )
    .optional()
    .nullable(),
});

export type SharePlan = z.infer<typeof sharePlanSchema>;
