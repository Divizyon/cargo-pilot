import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DoorDirection } from '@/lib/types/vehicle';
import type { VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorDirectionFieldProps {
  form: UseFormReturn<VehicleFormValues>;
  vehicleType?: VehicleTypeValue;
  hideHeading?: boolean;
}

const DIRECTIONS = [DoorDirection.Rear, DoorDirection.Side, DoorDirection.Top] as const;

function getDirectionLabel(dir: string): string {
  if (dir === DoorDirection.Rear) return 'Arka';
  if (dir === DoorDirection.Side) return 'Yan';
  return 'Üst';
}

export function VehicleDoorDirectionField({
  form,
  vehicleType: _vehicleType,
}: VehicleDoorDirectionFieldProps) {
  return (
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
            }}
            className="flex gap-2"
          >
            {DIRECTIONS.map((dir) => (
              <ToggleGroupItem
                key={dir}
                value={dir}
                aria-label={getDirectionLabel(dir)}
                className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                {getDirectionLabel(dir)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {fieldState.error && (
            <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
          )}
        </FormItem>
      )}
    />
  );
}
