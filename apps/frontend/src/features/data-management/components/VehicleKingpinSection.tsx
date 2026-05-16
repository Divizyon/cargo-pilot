import { useState } from 'react';
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

  const toStr = (v: number | undefined) => (v != null && Number.isFinite(v) ? String(v) : '');
  const [distanceDisplay, setDistanceDisplay] = useState(() =>
    toStr(form.getValues('kingpin.distance')),
  );
  const [tareWeightDisplay, setTareWeightDisplay] = useState(() =>
    toStr(form.getValues('kingpin.tareWeight')),
  );
  const [maxLoadDisplay, setMaxLoadDisplay] = useState(() =>
    toStr(form.getValues('kingpin.maxLoad')),
  );

  return (
    <div className="flex flex-col gap-3">
      {'message' in (form.formState.errors.kingpin ?? {}) && (
        <p className="text-sm font-medium text-destructive">
          {(form.formState.errors.kingpin as { message?: string }).message}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {/* AC3: Uzaklık — aracın ön noktasından mesafe */}
        <FormField
          control={form.control}
          name="kingpin.distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ön Noktadan Uzaklık</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="360"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={distanceDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setDistanceDisplay(raw);
                      field.onChange(
                        raw === '' || !Number.isFinite(parseFloat(raw))
                          ? undefined
                          : parseFloat(raw),
                      );
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

        <FormField
          control={form.control}
          name="kingpin.tareWeight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dara Ağırlığı</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="8000"
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

        <FormField
          control={form.control}
          name="kingpin.maxLoad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maks. Yük</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    max={KINGPIN_LEGAL_MAX_LOAD}
                    placeholder="12000"
                    className="h-9 border-input bg-background pr-10"
                    {...field}
                    value={maxLoadDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setMaxLoadDisplay(raw);
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
    </div>
  );
}
