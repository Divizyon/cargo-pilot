import { useForm } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  vehicleFormSchema,
  type VehicleFormValues,
} from '@/features/data-management/vehicles/schemas/vehicleSchema';

export function useVehicleForm(
  defaultValues?: Partial<VehicleFormValues>,
): UseFormReturn<VehicleFormValues> {
  return useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema) as Resolver<VehicleFormValues>,
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
      isActive: true,
      vehicleType: 'Tir',
      doorDirection: 'front',
      ...defaultValues,
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  }) as UseFormReturn<VehicleFormValues>;
}
