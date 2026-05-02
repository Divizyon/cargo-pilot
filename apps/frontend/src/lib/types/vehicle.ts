import { z } from 'zod';

export const VehicleType = {
  Tir: 'Tir',
  Kamyon: 'Kamyon',
  Romork: 'Romork',
  Konteyner: 'Konteyner',
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  payload: z.number().positive(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
