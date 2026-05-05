import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVehicleDuplicateCheck } from '@/lib/api/useVehicles';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';

interface VehicleIdentityFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
  section?: 'all' | 'name-only' | 'description-only';
}

export function VehicleIdentityFields({ form, section = 'all' }: VehicleIdentityFieldsProps) {
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
      {section !== 'description-only' && (
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Araç Adı <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-9 border-zinc-200 bg-white"
                  placeholder="Örn: 34 ABC 123 veya Filo Tır 1"
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
      )}
      {section !== 'name-only' && (
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Açıklama{' '}
                <span className="text-xs font-normal text-muted-foreground">(Opsiyonel)</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  className="resize-none border-zinc-200 bg-white"
                  placeholder="Araç hakkında ek notlar..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
