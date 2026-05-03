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
  hideHeading?: boolean;
}

export function VehiclePlateOrSerialField({ form, hideHeading }: VehiclePlateOrSerialFieldProps) {
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

  const field =
    vehicleType === VehicleType.Konteyner ? (
      <FormField
        control={form.control}
        name="serialNumber"
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>Seri Numarası</FormLabel>
            <FormControl>
              <Input
                {...f}
                value={f.value ?? ''}
                onBlur={(e) => {
                  f.onBlur();
                  const trimmed = e.target.value.trim();
                  form.setValue('serialNumber', trimmed);
                  if (trimmed) setSerialToCheck(trimmed);
                }}
                onChange={(e) => {
                  f.onChange(e);
                  form.clearErrors('serialNumber');
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ) : (
      <FormField
        control={form.control}
        name="plate"
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>Plaka</FormLabel>
            <FormControl>
              <Input
                {...f}
                value={f.value ?? ''}
                onBlur={(e) => {
                  f.onBlur();
                  const trimmed = e.target.value.trim();
                  form.setValue('plate', trimmed);
                  if (trimmed) setPlateToCheck(trimmed);
                }}
                onChange={(e) => {
                  f.onChange(e);
                  form.clearErrors('plate');
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {!hideHeading && (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Plaka / Seri No
        </h3>
      )}
      {field}
    </div>
  );
}
