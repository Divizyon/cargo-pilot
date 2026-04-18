import { z } from 'zod';

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  length: z.number().positive(),
  payload: z.number().positive(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
