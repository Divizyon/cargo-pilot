import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleStatusToggleProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleStatusToggle({ form }: VehicleStatusToggleProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Operasyonel Durum
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Araç planlamalara dahil edilsin mi?
          </p>
        </div>
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
