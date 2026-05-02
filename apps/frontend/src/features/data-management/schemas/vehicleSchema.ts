import { z } from 'zod';
import { VehicleType, type VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';

const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as [VehicleTypeValue, ...VehicleTypeValue[]];

export const vehicleFormSchema = z
  .object({
    vehicleType: z.enum(VEHICLE_TYPE_VALUES, { message: 'Araç tipi zorunludur' }),
    name: z
      .string()
      .min(1, 'Araç adı zorunludur')
      .max(100, 'Araç adı en fazla 100 karakter olabilir'),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
    plate: z.string().max(20, 'Plaka en fazla 20 karakter olabilir').optional(),
    serialNumber: z.string().max(50, 'Seri numarası en fazla 50 karakter olabilir').optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.vehicleType) return;
    if (data.vehicleType !== VehicleType.Konteyner) {
      if (!data.plate?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plaka zorunludur', path: ['plate'] });
      }
    } else {
      if (!data.serialNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seri numarası zorunludur',
          path: ['serialNumber'],
        });
      }
    }
  });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
