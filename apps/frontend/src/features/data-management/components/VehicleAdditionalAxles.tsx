import { forwardRef, useImperativeHandle } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2 } from 'lucide-react';
import { validateAxleDistances } from '@/lib/utils/validateAxleSum';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

export interface VehicleAdditionalAxlesHandle {
  addAxle: () => void;
  canAdd: boolean;
}

interface VehicleAdditionalAxlesProps {
  form: UseFormReturn<VehicleFormValues>;
}

export const VehicleAdditionalAxles = forwardRef<
  VehicleAdditionalAxlesHandle,
  VehicleAdditionalAxlesProps
>(function VehicleAdditionalAxles({ form }, ref) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

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

  useImperativeHandle(
    ref,
    () => ({
      addAxle: () => append({ distance: 0, tareWeight: 0, maxLoad: 0 }),
      canAdd: fields.length < 1,
    }),
    [append, fields.length],
  );

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {fields.map((fieldItem, index) => (
        <div key={fieldItem.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <FormField
            control={form.control}
            name={`axles.${index}.maxLoad`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Kapasite</FormLabel>}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="11500"
                      className="h-9 border-input bg-background pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(
                          raw === '' || !Number.isFinite(parseFloat(raw))
                            ? undefined
                            : parseFloat(raw),
                        );
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
            name={`axles.${index}.tareWeight`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Dara Ağırlığı</FormLabel>}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="3000"
                      className="h-9 border-input bg-background pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(
                          raw === '' || !Number.isFinite(parseFloat(raw))
                            ? undefined
                            : parseFloat(raw),
                        );
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
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
            name={`axles.${index}.distance`}
            render={({ field }) => (
              <FormItem>
                {index === 0 && <FormLabel>Mesafe</FormLabel>}
                <FormControl>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="850"
                      className="h-9 border-input bg-background pr-8"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        field.onChange(
                          raw === '' || !Number.isFinite(parseFloat(raw))
                            ? undefined
                            : parseFloat(raw),
                        );
                      }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {dimensionUnit}
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
            Aks mesafeleri toplamı ({distanceSum} {dimensionUnit}) araç uzunluğunu ({vehicleLength}{' '}
            {dimensionUnit}) aşıyor.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});
