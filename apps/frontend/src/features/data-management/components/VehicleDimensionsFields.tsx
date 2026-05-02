import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      <h2 className="text-base font-semibold">Fiziksel İç Ölçüler</h2>
      <div className="grid grid-cols-3 gap-3">
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uzunluk ({DIMENSION_UNIT})</FormLabel>
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
          name="width"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Genişlik ({DIMENSION_UNIT})</FormLabel>
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
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yükseklik ({DIMENSION_UNIT})</FormLabel>
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
      {volume !== null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Hesaplanan Hacim:</span>
          <Badge variant="secondary">
            {volume >= 1_000_000
              ? `${(volume / 1_000_000).toFixed(2)} m³`
              : volume >= 1_000
                ? `${(volume / 1_000).toFixed(1)} dm³`
                : `${volume} cm³`}
          </Badge>
        </div>
      )}
    </div>
  );
}
