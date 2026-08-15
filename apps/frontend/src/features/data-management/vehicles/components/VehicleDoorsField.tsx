import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { FormItem } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DoorType, DoorFace, findDoor, type VehicleDoor } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorsFieldProps {
  form: UseFormReturn<VehicleFormValues>;
}

/**
 * Yan kapı seçenekleri. Kullanıcıya "sol/sağ" gösterilir, kayda yüz değeri gider;
 * standart yön adlandırması kullanmaz (docs/COORDINATE_STANDARD.md §4).
 */
const SIDE_OPTIONS = [
  { value: 'none', label: 'Yok' },
  { value: DoorFace.ZeroX, label: 'Sol' },
  { value: DoorFace.WidthX, label: 'Sağ' },
] as const;

function buildDoors(hasRear: boolean, sideFace: DoorFace | null): VehicleDoor[] {
  const doors: VehicleDoor[] = [];
  if (hasRear) doors.push({ type: DoorType.Small, face: DoorFace.LengthZ });
  if (sideFace) doors.push({ type: DoorType.Big, face: sideFace });
  return doors;
}

export function VehicleDoorsField({ form }: VehicleDoorsFieldProps) {
  return (
    <Controller
      control={form.control}
      name="doors"
      render={({ field, fieldState }) => {
        const doors = field.value ?? [];
        const hasRear = findDoor(doors, DoorType.Small) !== undefined;
        const sideFace = findDoor(doors, DoorType.Big)?.face ?? null;

        const update = (nextRear: boolean, nextSide: DoorFace | null) => {
          field.onChange(buildDoors(nextRear, nextSide));
          form.clearErrors('doors');
        };

        return (
          <FormItem className="space-y-4">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="door-rear"
                checked={hasRear}
                onCheckedChange={(checked) => update(checked === true, sideFace)}
              />
              <label
                htmlFor="door-rear"
                className="cursor-pointer text-sm font-medium leading-none"
              >
                Arka kapı
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium leading-none text-muted-foreground">
                Yan kapı
              </span>
              <ToggleGroup
                type="single"
                value={sideFace ?? 'none'}
                onValueChange={(val) => {
                  if (!val) return;
                  update(hasRear, val === 'none' ? null : (val as DoorFace));
                }}
                className="flex gap-2"
              >
                {SIDE_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={`Yan kapı: ${option.label}`}
                    className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Bölge ayrımı referans kapıya bağlıdır: arka kapı yoksa LIFO
                kriteri sessizce etkisiz kalır, kullanıcı bunu önden bilmeli. */}
            {!hasRear && sideFace !== null && (
              <p className="text-sm text-muted-foreground">
                Arka kapı olmadan yükleme sırası LIFO bölgelerine ayrılamaz; plan oluştururken LIFO
                kriteri devre dışı kalır.
              </p>
            )}

            {fieldState.error && (
              <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
            )}
          </FormItem>
        );
      }}
    />
  );
}
