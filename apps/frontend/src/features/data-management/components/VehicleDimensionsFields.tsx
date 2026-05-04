import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { calculateVolume } from '@/lib/utils/calculateVolume';
import { DIMENSION_UNIT } from '@/lib/config/vehicle-config';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDimensionsFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleDimensionsFields({ form }: VehicleDimensionsFieldsProps) {
  const [length, width, height] = useWatch({
    control: form.control,
    name: ['length', 'width', 'height'],
  });

  const volume = useMemo(() => {
    if (!length || !width || !height) return null;
    return calculateVolume(length, width, height);
  }, [length, width, height]);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Fiziksel İç Ölçüler
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Uzunluk ({DIMENSION_UNIT})
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Genişlik ({DIMENSION_UNIT})
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">
                Yükseklik ({DIMENSION_UNIT})
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    className="h-9 border-zinc-200 bg-white pr-10"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
      {volume !== null && (
        <p className="text-xs text-muted-foreground">
          Toplam Hacim:{' '}
          <span className="font-semibold text-foreground">
            {volume >= 1_000_000
              ? `${(volume / 1_000_000).toFixed(2)} m³`
              : volume >= 1_000
                ? `${(volume / 1_000).toFixed(1)} dm³`
                : `${volume} cm³`}
          </span>
        </p>
      )}
    </div>
  );
}
