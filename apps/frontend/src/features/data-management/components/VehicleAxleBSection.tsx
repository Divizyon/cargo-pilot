import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { calculateTotalTare } from '@/lib/utils/calculateTotalTare';
import { WEIGHT_UNIT, DIMENSION_UNIT } from '@/lib/config/vehicle-config';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleAxleBSectionProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleAxleBSection({ form }: VehicleAxleBSectionProps) {
  const [axleB, kingpin, mainTare] = useWatch({
    control: form.control,
    name: ['axleB', 'kingpin', 'tareWeight'],
  });

  const totalTare = useMemo(
    () =>
      calculateTotalTare([
        { tareWeight: mainTare },
        { tareWeight: axleB?.tareWeight },
        { tareWeight: kingpin?.tareWeight },
      ]),
    [mainTare, axleB, kingpin],
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Aks Yönetimi
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Ana Aks (Dingil B)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="axleB.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Kapasite ({WEIGHT_UNIT})
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => { const v = e.target.valueAsNumber; field.onChange(Number.isNaN(v) ? undefined : v); }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    kg
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
              <FormLabel className="text-xs font-medium text-foreground">
                Mesafe ({DIMENSION_UNIT})
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => { const v = e.target.valueAsNumber; field.onChange(Number.isNaN(v) ? undefined : v); }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    cm
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
      {totalTare > 0 && (
        <p className="text-xs text-muted-foreground">
          Toplam boş ağırlık:{' '}
          <span className="font-semibold text-foreground">
            {totalTare.toLocaleString('tr-TR')} {WEIGHT_UNIT}
          </span>
        </p>
      )}
    </div>
  );
}
