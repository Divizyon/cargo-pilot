import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/form';
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
                        : 'border-border bg-background text-foreground hover:border-foreground/40',
                    )}
                  >
                    {isSelected && (
                      <span className="inline-block h-2 w-2 rounded-sm bg-background" aria-hidden />
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
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'right', label: 'Sağ + Yan Kapı' },
                  { value: 'left', label: 'Sol + Yan Kapı' },
                ].map(({ value, label }) => {
                  const isSelected = field.value === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => field.onChange(value)}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-all',
                        isSelected
                          ? 'border-foreground bg-foreground text-white'
                          : 'border-border bg-background text-foreground hover:border-foreground/40',
                      )}
                    >
                      {isSelected && (
                        <span
                          className="inline-block h-2 w-2 rounded-sm bg-background"
                          aria-hidden
                        />
                      )}
                      {label}
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
      )}
    </div>
  );
}
