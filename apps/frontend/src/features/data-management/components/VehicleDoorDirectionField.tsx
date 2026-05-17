import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DoorDirection, VehicleType } from '@/lib/types/vehicle';
import type { VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorDirectionFieldProps {
  form: UseFormReturn<VehicleFormValues>;
  vehicleType?: VehicleTypeValue;
  hideHeading?: boolean; // kept for API compatibility
}

const KONTEYNER_DIRECTIONS = [DoorDirection.Rear, DoorDirection.Side] as const;
const OTHER_DIRECTIONS = [DoorDirection.Rear, DoorDirection.Side, DoorDirection.Top] as const;

function getDirectionLabel(dir: string, isKonteyner: boolean): string {
  if (dir === DoorDirection.Rear) return isKonteyner ? 'Ön' : 'Arka';
  if (dir === DoorDirection.Side) return 'Yan';
  return 'Üst';
}

export function VehicleDoorDirectionField({ form, vehicleType }: VehicleDoorDirectionFieldProps) {
  const isKonteyner = vehicleType === VehicleType.Konteyner;
  const directions = isKonteyner ? KONTEYNER_DIRECTIONS : OTHER_DIRECTIONS;

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
            {directions.map((dir) => (
              <ToggleGroupItem
                key={dir}
                value={dir}
                aria-label={getDirectionLabel(dir, isKonteyner)}
                className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                {getDirectionLabel(dir, isKonteyner)}
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
