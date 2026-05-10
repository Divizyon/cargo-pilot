import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { calculateTotalTare } from '@/lib/utils/calculateTotalTare';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleAxleBSectionProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleAxleBSection({ form }: VehicleAxleBSectionProps) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

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
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="axleB.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kapasite ({weightUnit})</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
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
              <FormLabel>Dara Ağırlığı ({weightUnit})</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
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
              <FormLabel>Mesafe ({dimensionUnit})</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
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
      {totalTare > 0 && (
        <p className="text-xs text-muted-foreground">
          Toplam boş ağırlık:{' '}
          <span className="font-semibold text-foreground">
            {totalTare.toLocaleString('tr-TR')} {weightUnit}
          </span>
        </p>
      )}
    </div>
  );
}
