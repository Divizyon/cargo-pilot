import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVehicleDuplicateCheck } from '@/lib/api/useVehicles';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';

interface VehicleIdentityFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleIdentityFields({ form }: VehicleIdentityFieldsProps) {
  const [nameToCheck, setNameToCheck] = useState('');

  const { data: duplicateCheck } = useVehicleDuplicateCheck(nameToCheck);

  useEffect(() => {
    if (duplicateCheck?.exists) {
      form.setError('name', {
        type: 'manual',
        message: 'Bu isimde bir araç zaten kayıtlı',
      });
    }
  }, [duplicateCheck, form]);

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Araç Adı</FormLabel>
            <FormControl>
              <Input
                {...field}
                onBlur={(e) => {
                  field.onBlur();
                  const trimmed = e.target.value.trim();
                  if (trimmed) setNameToCheck(trimmed);
                }}
                onChange={(e) => {
                  field.onChange(e);
                  form.clearErrors('name');
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Açıklama</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
