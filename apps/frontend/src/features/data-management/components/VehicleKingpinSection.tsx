import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { KINGPIN_LEGAL_MAX_LOAD } from '@/lib/config/vehicle-config';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleKingpinSectionProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleKingpinSection({ form }: VehicleKingpinSectionProps) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        King Pimi (Dingil A)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="kingpin.distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aracın Ön Noktasından Uzaklık ({dimensionUnit})</FormLabel>
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
          name="kingpin.tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dara Ağırlığı ({weightUnit})</FormLabel>
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
          name="kingpin.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Maks. Yük ({weightUnit}, yasal limit:{' '}
                {KINGPIN_LEGAL_MAX_LOAD.toLocaleString('tr-TR')})
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={KINGPIN_LEGAL_MAX_LOAD}
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
    </div>
  );
}
