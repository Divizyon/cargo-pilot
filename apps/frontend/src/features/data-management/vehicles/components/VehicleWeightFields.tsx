import { useState } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateAxleCapacity } from '@/features/data-management/vehicles/utils/validateAxleSum';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleWeightFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleWeightFields({ form }: VehicleWeightFieldsProps) {
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const toStr = (v: number | undefined) => (v != null && Number.isFinite(v) ? String(v) : '');
  const [maxCargoDisplay, setMaxCargoDisplay] = useState(() =>
    toStr(form.getValues('maxCargoWeight')),
  );
  const [grossWeightDisplay, setGrossWeightDisplay] = useState(() =>
    toStr(form.getValues('grossWeight')),
  );
  const [tareWeightDisplay, setTareWeightDisplay] = useState(() =>
    toStr(form.getValues('tareWeight')),
  );

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
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="maxCargoWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maks. Kargo Yükü</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="26000"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={maxCargoDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMaxCargoDisplay(raw);
                      field.onChange(
                        raw === '' || !Number.isFinite(parseFloat(raw))
                          ? undefined
                          : parseFloat(raw),
                      );
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
          name="grossWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brüt Ağırlık</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="40000"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={grossWeightDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setGrossWeightDisplay(raw);
                      field.onChange(
                        raw === '' || !Number.isFinite(parseFloat(raw))
                          ? undefined
                          : parseFloat(raw),
                      );
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
          name="tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dara Ağırlığı</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="14000"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={tareWeightDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTareWeightDisplay(raw);
                      field.onChange(
                        raw === '' || !Number.isFinite(parseFloat(raw))
                          ? undefined
                          : parseFloat(raw),
                      );
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
