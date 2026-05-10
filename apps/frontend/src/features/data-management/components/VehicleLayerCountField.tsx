import { useState } from 'react';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
    <FormField
      control={form.control}
      name="maxLayerCount"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>Maks. İstif Katmanı</FormLabel>
            <Controller
              control={form.control}
              name="maxLayerCount"
              render={() => (
                <div className="flex items-center gap-1.5">
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
          <FormControl>
            <Input
              type="number"
              min="1"
              step="1"
              disabled={unlimited}
              className="h-9 border-input bg-background"
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
  );
}
