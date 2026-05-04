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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DoorDirection } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorDirectionFieldProps {
  form: UseFormReturn<VehicleFormValues>;
  hideHeading?: boolean;
}

const DIRECTION_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
  rearAndSide: 'Arka + Yan',
};

export function VehicleDoorDirectionField({ form, hideHeading }: VehicleDoorDirectionFieldProps) {
  const doorDirection = useWatch({ control: form.control, name: 'doorDirection' });

  return (
    <div className="flex flex-col gap-3">
      {hideHeading ? (
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kapı Yönü
        </span>
      ) : (
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kapı Yönü
        </h3>
      )}
      <Controller
        control={form.control}
        name="doorDirection"
        render={({ field, fieldState }) => (
          <FormItem>
            <ToggleGroup
              type="single"
              value={field.value}
              onValueChange={(val) => {
                if (val) {
                  field.onChange(val);
                  form.clearErrors('doorDirection');
                  if (val !== DoorDirection.Side && val !== DoorDirection.RearAndSide) {
                    form.setValue('doorSide', undefined);
                    form.clearErrors('doorSide');
                  }
                }
              }}
              className="justify-start"
            >
              {Object.values(DoorDirection).map((dir) => (
                <ToggleGroupItem key={dir} value={dir}>
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

      {(doorDirection === DoorDirection.Side || doorDirection === DoorDirection.RearAndSide) && (
        <Controller
          control={form.control}
          name="doorSide"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Kapı Tarafı</FormLabel>
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-40">
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
