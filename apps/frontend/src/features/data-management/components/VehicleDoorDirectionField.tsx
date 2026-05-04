import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem, FormLabel } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DoorDirection } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorDirectionFieldProps {
  form: UseFormReturn<VehicleFormValues>;
  hideHeading?: boolean; // kept for API compatibility
}

const DIRECTION_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
  rearAndSide: 'Arka + Yan',
};

export function VehicleDoorDirectionField({ form }: VehicleDoorDirectionFieldProps) {
  const doorDirection = useWatch({ control: form.control, name: 'doorDirection' });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Kapı Yönü
      </h3>
      <Controller
        control={form.control}
        name="doorDirection"
        render={({ field, fieldState }) => (
          <FormItem>
            <div className="flex flex-wrap gap-2">
              {Object.values(DoorDirection).map((dir) => {
                const isSelected = field.value === dir;
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      field.onChange(dir);
                      form.clearErrors('doorDirection');
                      if (dir !== DoorDirection.Side && dir !== DoorDirection.RearAndSide) {
                        form.setValue('doorSide', undefined);
                        form.clearErrors('doorSide');
                      }
                    }}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-all',
                      isSelected
                        ? 'border-foreground bg-foreground text-white'
                        : 'border-zinc-300 bg-white text-foreground hover:border-zinc-400',
                    )}
                  >
                    {isSelected && (
                      <span className="inline-block h-2 w-2 rounded-sm bg-white" aria-hidden />
                    )}
                    {DIRECTION_LABELS[dir]}
                  </button>
                );
              })}
            </div>
            {fieldState.error && (
              <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
            )}
          </FormItem>
        )}
      />

      {(doorDirection === DoorDirection.Side || doorDirection === DoorDirection.RearAndSide) && (
        <Controller
          control={form.control}
          name="doorSide"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-foreground">Kapı Tarafı</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="h-9 w-40 border-zinc-200 bg-white">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Sağ</SelectItem>
                  <SelectItem value="left">Sol</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error && (
                <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
              )}
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
