import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleStatusToggleProps {
  form: UseFormReturn<VehicleFormValues>;
  compact?: boolean;
}

export function VehicleStatusToggle({ form, compact }: VehicleStatusToggleProps) {
  return (
    <FormField
      control={form.control}
      name="isActive"
      render={({ field }) => (
        <FormItem className="flex items-start justify-between gap-3">
          {compact ? (
            <div className="flex-1 space-y-0.5">
              <FormLabel className="text-sm font-medium">
                {field.value ? 'Aktif' : 'Pasif'}
              </FormLabel>
              <p className="text-xs text-muted-foreground">
                {field.value
                  ? 'Aktif durumdaki araçlar yükleme planlarında seçilebilir.'
                  : 'Pasif araçlar planlama ekranında görünmez.'}
              </p>
            </div>
          ) : (
            <FormLabel className="!mt-0 flex-1">{field.value ? 'Aktif' : 'Pasif'}</FormLabel>
          )}
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
