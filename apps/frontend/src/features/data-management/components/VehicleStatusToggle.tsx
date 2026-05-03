import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleStatusToggleProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleStatusToggle({ form }: VehicleStatusToggleProps) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Operasyonel Durum
      </h3>
      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3">
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="!mt-0">{field.value ? 'Aktif' : 'Pasif'}</FormLabel>
          </FormItem>
        )}
      />
    </div>
  );
}
