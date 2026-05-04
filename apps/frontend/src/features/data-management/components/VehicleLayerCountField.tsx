import { useState } from 'react';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleLayerCountFieldProps {
  form: UseFormReturn<VehicleFormValues>;
  hideHeading?: boolean; // kept for API compatibility
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
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Maks. İstif Katmanı
        </h3>
        <Controller
          control={form.control}
          name="maxLayerCount"
          render={() => (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sınırsız</span>
              <Switch
                id="unlimited-layers"
                checked={unlimited}
                onCheckedChange={handleUnlimitedChange}
              />
            </div>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="maxLayerCount"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                type="number"
                min="1"
                step="1"
                disabled={unlimited}
                className="h-9 border-zinc-200 bg-white"
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
    </div>
  );
}
