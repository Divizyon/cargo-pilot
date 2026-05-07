import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAxleCapacity } from '@/lib/utils/validateAxleSum';
import { WEIGHT_UNIT } from '@/lib/config/vehicle-config';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleWeightFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleWeightFields({ form }: VehicleWeightFieldsProps) {
  const [maxCargoWeight, axleB, axles, kingpin] = useWatch({
    control: form.control,
    name: ['maxCargoWeight', 'axleB', 'axles', 'kingpin'],
  });

  const allAxleMaxLoads = [
    ...(axleB ? [axleB.maxLoad ?? 0] : []),
    ...(axles ?? []).map((a) => a.maxLoad ?? 0),
    ...(kingpin ? [kingpin.maxLoad ?? 0] : []),
  ];

  const showCapacityWarning =
    allAxleMaxLoads.length > 0 &&
    !!maxCargoWeight &&
    !validateAxleCapacity(allAxleMaxLoads, maxCargoWeight);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Ağırlık Limitleri
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="maxCargoWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Maks. Kargo Yükü
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {WEIGHT_UNIT}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="grossWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">Brüt Ağırlık</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {WEIGHT_UNIT}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">Dara Ağırlığı</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber;
                      field.onChange(Number.isNaN(v) ? undefined : v);
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {WEIGHT_UNIT}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {showCapacityWarning && (
        <Alert variant="warning">
          <AlertDescription>
            Aksların toplam kapasitesi maksimum kargo yükünden düşük. Aks konfigürasyonunu kontrol
            ediniz.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
