import { useFieldArray, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2 } from 'lucide-react';
import { validateAxleDistances } from '@/lib/utils/validateAxleSum';
import { WEIGHT_UNIT, DIMENSION_UNIT } from '@/lib/config/vehicle-config';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleAdditionalAxlesProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleAdditionalAxles({ form }: VehicleAdditionalAxlesProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'axles',
  });

  const [axles, vehicleLength] = useWatch({
    control: form.control,
    name: ['axles', 'length'],
  });

  const distanceSum = (axles ?? []).reduce((s, a) => s + (a.distance ?? 0), 0);
  const showDistanceWarning =
    fields.length > 0 && !!vehicleLength && !validateAxleDistances([distanceSum], vehicleLength);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => append({ distance: 0, tareWeight: 0, maxLoad: 0 })}
        >
          <Plus className="h-3.5 w-3.5" />
          Yeni Aks Ekle
        </Button>
      </div>

      {fields.map((fieldItem, index) => (
        <div key={fieldItem.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <FormField
            control={form.control}
            name={`axles.${index}.maxLoad`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && (
                  <FormLabel className="text-xs font-medium text-foreground">
                    Kapasite ({WEIGHT_UNIT})
                  </FormLabel>
                )}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      className="h-9 border-zinc-200 bg-white pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(v) ? undefined : v);
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
            name={`axles.${index}.tareWeight`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && (
                  <FormLabel className="text-xs font-medium text-foreground">
                    Dara Ağırlığı ({WEIGHT_UNIT})
                  </FormLabel>
                )}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      className="h-9 border-zinc-200 bg-white pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(v) ? undefined : v);
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
            name={`axles.${index}.distance`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && (
                  <FormLabel className="text-xs font-medium text-foreground">
                    Mesafe ({DIMENSION_UNIT})
                  </FormLabel>
                )}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      className="h-9 border-zinc-200 bg-white pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.valueAsNumber;
                        field.onChange(Number.isNaN(v) ? undefined : v);
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      cm
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-9 w-9 p-0 text-muted-foreground hover:text-destructive ${index === 0 ? 'mt-6' : ''}`}
            onClick={() => remove(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {showDistanceWarning && (
        <Alert variant="warning">
          <AlertDescription>
            Aks mesafeleri toplamı ({distanceSum} {DIMENSION_UNIT}) araç uzunluğunu ({vehicleLength}{' '}
            {DIMENSION_UNIT}) aşıyor.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
