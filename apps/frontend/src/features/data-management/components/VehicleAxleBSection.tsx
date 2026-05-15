import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleAxleBSectionProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleAxleBSection({ form }: VehicleAxleBSectionProps) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="axleB.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kapasite</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="11500"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      field.onChange(raw === '' || !Number.isFinite(parseFloat(raw)) ? undefined : parseFloat(raw));
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {weightUnit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="axleB.tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dara Ağırlığı</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="3000"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      field.onChange(raw === '' || !Number.isFinite(parseFloat(raw)) ? undefined : parseFloat(raw));
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {weightUnit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="axleB.distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mesafe</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="850"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      field.onChange(raw === '' || !Number.isFinite(parseFloat(raw)) ? undefined : parseFloat(raw));
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {dimensionUnit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {'message' in (form.formState.errors.axleB ?? {}) && (
        <p className="text-sm font-medium text-destructive">
          {(form.formState.errors.axleB as { message?: string }).message}
        </p>
      )}
    </div>
  );
}
