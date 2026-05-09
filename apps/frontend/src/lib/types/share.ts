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
  vehiclePlate: z.string().optional(),
  createdAt: z.string(),
  plannedAt: z.string().optional(),
  status: z.enum(['taslak', 'aktif', 'tamamlandi', 'iptal']),
  productCount: z.number().int().nonnegative(),
  totalWeightKg: z.number().nonnegative(),
  vehicleCapacityKg: z.number().positive(),
  fillPercentage: z.number().min(0),
  isExpired: z.boolean(),
});

export type SharePlan = z.infer<typeof sharePlanSchema>;
