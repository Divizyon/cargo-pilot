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
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ana Aks (Dingil B)</h3>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="axleB.distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uzaklık ({DIMENSION_UNIT})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
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
              <FormLabel>Dara Ağırlığı ({WEIGHT_UNIT})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="axleB.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maks. Yük ({WEIGHT_UNIT})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {totalTare > 0 && (
        <p className="text-sm text-muted-foreground">
          Toplam boş ağırlık:{' '}
          <span className="font-medium">
            {totalTare.toLocaleString('tr-TR')} {WEIGHT_UNIT}
          </span>
        </p>
      )}
    </div>
  );
}
