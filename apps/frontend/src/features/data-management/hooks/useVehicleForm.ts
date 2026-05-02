import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/data-management/schemas/vehicleSchema';

export function useVehicleForm(defaultValues?: Partial<VehicleFormValues>) {
  return useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      ...defaultValues,
    },
    mode: 'onChange',
  });
}
