import { useState } from 'react';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleLayerCountFieldProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleLayerCountField({ form }: VehicleLayerCountFieldProps) {
  const [unlimited, setUnlimited] = useState(false);

  function handleUnlimitedChange(checked: boolean) {
    setUnlimited(checked);
    if (checked) {
      form.setValue('maxLayerCount', undefined);
      form.clearErrors('maxLayerCount');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Maksimum İstif Katmanı</h2>
      <div className="flex items-end gap-4">
        <FormField
          control={form.control}
          name="maxLayerCount"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Katman Sayısı</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  disabled={unlimited}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                  onKeyDown={(e) => {
                    if (['.', ',', '-'].includes(e.key)) e.preventDefault();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Controller
          control={form.control}
          name="maxLayerCount"
          render={() => (
            <div className="mb-2 flex items-center gap-2">
              <Switch
                id="unlimited-layers"
                checked={unlimited}
                onCheckedChange={handleUnlimitedChange}
              />
              <label htmlFor="unlimited-layers" className="text-sm">
                Sınırsız
              </label>
            </div>
          )}
        />
      </div>
    </div>
  );
}
