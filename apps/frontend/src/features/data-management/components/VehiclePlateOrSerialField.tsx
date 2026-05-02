import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useVehiclePlateCheck, useVehicleSerialCheck } from '@/lib/api/useVehicles';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { VehicleType } from '@/lib/types/vehicle';

interface VehiclePlateOrSerialFieldProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehiclePlateOrSerialField({ form }: VehiclePlateOrSerialFieldProps) {
  const vehicleType = useWatch({ control: form.control, name: 'vehicleType' });
  const [plateToCheck, setPlateToCheck] = useState('');
  const [serialToCheck, setSerialToCheck] = useState('');

  const { data: plateCheck } = useVehiclePlateCheck(plateToCheck);
  const { data: serialCheck } = useVehicleSerialCheck(serialToCheck);

  useEffect(() => {
    if (plateCheck?.exists) {
      form.setError('plate', { type: 'manual', message: 'Bu plakaya ait araç zaten kayıtlı' });
    }
  }, [plateCheck, form]);

  useEffect(() => {
    if (serialCheck?.exists) {
      form.setError('serialNumber', {
        type: 'manual',
        message: 'Bu seri numarasına ait araç zaten kayıtlı',
      });
    }
  }, [serialCheck, form]);

  if (!vehicleType) return null;

  if (vehicleType === VehicleType.Konteyner) {
    return (
      <FormField
        control={form.control}
        name="serialNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Seri Numarası</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ''}
                onBlur={(e) => {
                  field.onBlur();
                  const trimmed = e.target.value.trim();
                  form.setValue('serialNumber', trimmed);
                  if (trimmed) setSerialToCheck(trimmed);
                }}
                onChange={(e) => {
                  field.onChange(e);
                  form.clearErrors('serialNumber');
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name="plate"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Plaka</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ''}
              onBlur={(e) => {
                field.onBlur();
                const trimmed = e.target.value.trim();
                form.setValue('plate', trimmed);
                if (trimmed) setPlateToCheck(trimmed);
              }}
              onChange={(e) => {
                field.onChange(e);
                form.clearErrors('plate');
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
