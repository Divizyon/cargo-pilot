import { useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  allSides: 'Tüm Kapılar',
};

export function VehicleDoorDirectionField({ form }: VehicleDoorDirectionFieldProps) {
  const doorDirection = useWatch({ control: form.control, name: 'doorDirection' });

  return (
    <div className="flex flex-col gap-3">
      <Controller
        control={form.control}
        name="doorDirection"
        render={({ field, fieldState }) => (
          <FormItem>
            <ToggleGroup
              type="single"
              value={field.value ?? ''}
              onValueChange={(val) => {
                if (!val) return;
                field.onChange(val);
                form.clearErrors('doorDirection');
                if (val !== DoorDirection.Side) {
                  form.setValue('doorSide', undefined);
                  form.clearErrors('doorSide');
                }
              }}
              className="flex gap-2"
            >
              {Object.values(DoorDirection).map((dir) => (
                <ToggleGroupItem
                  key={dir}
                  value={dir}
                  aria-label={DIRECTION_LABELS[dir]}
                  className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  {DIRECTION_LABELS[dir]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {fieldState.error && (
              <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
            )}
          </FormItem>
        )}
      />

      {doorDirection === DoorDirection.Side && (
        <Controller
          control={form.control}
          name="doorSide"
          render={({ field, fieldState }) => (
            <FormItem>
              <ToggleGroup
                type="single"
                value={field.value ?? ''}
                onValueChange={(val) => {
                  if (val) field.onChange(val);
                }}
                className="flex gap-2"
              >
                {[
                  { value: 'right', label: 'Sağ + Yan Kapı' },
                  { value: 'left', label: 'Sol + Yan Kapı' },
                ].map(({ value, label }) => (
                  <ToggleGroupItem
                    key={value}
                    value={value}
                    aria-label={label}
                    className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
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
