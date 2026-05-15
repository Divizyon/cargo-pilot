import { useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { calculateVolume } from '@/lib/utils/calculateVolume';
import { formatVolumeDisplay } from '@/lib/utils/unitConversion';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDimensionsFieldsProps {
  form: UseFormReturn<VehicleFormValues>;
}

export function VehicleDimensionsFields({ form }: VehicleDimensionsFieldsProps) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const volumeUnit = useUnitStore((s) => s.volumeUnit);

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
      <div className="grid grid-cols-3 gap-3">
        {/* X — Uzunluk */}
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uzunluk (X)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="1350"
                    className="h-9 border-input bg-background pr-10"
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {dimensionUnit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Y — Yükseklik */}
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yükseklik (Y)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="270"
                    className="h-9 border-input bg-background pr-10"
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {dimensionUnit}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Z — Derinlik */}
        <FormField
          control={form.control}
          name="width"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Derinlik (Z)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="240"
                    className="h-9 border-input bg-background pr-10"
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {dimensionUnit}
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
            {formatVolumeDisplay(volume, volumeUnit)}
          </span>
        </p>
      )}
    </div>
  );
}
