import { useFieldArray, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          İlave Akslar
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ distance: 0, tareWeight: 0, maxLoad: 0 })}
        >
          Yeni Aks Ekle
        </Button>
      </div>

      {fields.map((fieldItem, index) => (
        <div key={fieldItem.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
          <FormField
            control={form.control}
            name={`axles.${index}.distance`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Uzaklık ({DIMENSION_UNIT})</FormLabel>}
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
            name={`axles.${index}.tareWeight`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Dara Ağırlığı ({WEIGHT_UNIT})</FormLabel>}
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
            name={`axles.${index}.maxLoad`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Maks. Yük ({WEIGHT_UNIT})</FormLabel>}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={index === 0 ? 'mt-6' : ''}
            onClick={() => remove(index)}
          >
            Sil
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
