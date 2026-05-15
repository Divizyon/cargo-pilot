import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleLayerCountFieldProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleLayerCountField({ form }: VehicleLayerCountFieldProps) {
  return (
    <FormField
      control={form.control}
      name="layerCount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Katman Sayısı</FormLabel>
          <FormControl>
            <Input
              type="text"
              inputMode="numeric"
              step="1"
              placeholder="3"
              className="h-9 border-input bg-background"
              value={field.value ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                field.onChange(
                  raw === '' || !Number.isFinite(parseFloat(raw)) ? undefined : parseFloat(raw),
                );
              }}
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
