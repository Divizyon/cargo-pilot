import { z } from 'zod';
import { VehicleType, type VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';

const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as [VehicleTypeValue, ...VehicleTypeValue[]];

export const vehicleFormSchema = z.object({
  vehicleType: z.enum(VEHICLE_TYPE_VALUES, { message: 'Araç tipi zorunludur' }),
  name: z
    .string()
    .min(1, 'Araç adı zorunludur')
    .max(100, 'Araç adı en fazla 100 karakter olabilir'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
