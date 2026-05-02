import { z } from 'zod';

export const vehicleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Araç adı zorunludur')
    .max(100, 'Araç adı en fazla 100 karakter olabilir'),
  description: z
    .string()
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
