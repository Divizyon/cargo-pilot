import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Settings2 } from 'lucide-react';
import { FormItem } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DoorType,
  DoorFace,
  DEFAULT_BIG_DOOR_FACE,
  findDoor,
  type VehicleDoor,
} from '@/lib/types/vehicle';
import type { VehicleFormValues } from '../schemas/vehicleSchema';

interface VehicleDoorsFieldProps {
  form: UseFormReturn<VehicleFormValues>;
}

type DoorSetKey = 'small' | 'big' | 'both';

const DOOR_SET_OPTIONS: { value: DoorSetKey; label: string; hasBigDoor: boolean }[] = [
  { value: 'small', label: 'Küçük kapı', hasBigDoor: false },
  { value: 'big', label: 'Büyük kapı', hasBigDoor: true },
  { value: 'both', label: 'Küçük ve büyük kapı', hasBigDoor: true },
];

const BIG_DOOR_FACE_OPTIONS: { value: DoorFace; label: string }[] = [
  { value: DoorFace.ZeroX, label: 'Sol' },
  { value: DoorFace.WidthX, label: 'Sağ' },
];

function buildDoors(setKey: DoorSetKey, bigDoorFace: DoorFace): VehicleDoor[] {
  const doors: VehicleDoor[] = [];
  if (setKey === 'small' || setKey === 'both') {
    doors.push({ type: DoorType.Small, face: DoorFace.LengthZ });
  }
  if (setKey === 'big' || setKey === 'both') {
    doors.push({ type: DoorType.Big, face: bigDoorFace });
  }
  return doors;
}

function resolveSetKey(doors: readonly VehicleDoor[]): DoorSetKey | null {
  const hasSmall = findDoor(doors, DoorType.Small) !== undefined;
  const hasBig = findDoor(doors, DoorType.Big) !== undefined;

  if (hasSmall && hasBig) return 'both';
  if (hasBig) return 'big';
  if (hasSmall) return 'small';
  return null;
}

export function VehicleDoorsField({ form }: VehicleDoorsFieldProps) {
  const [openFacePicker, setOpenFacePicker] = useState(false);

  return (
    <Controller
      control={form.control}
      name="doors"
      render={({ field, fieldState }) => {
        const doors = field.value ?? [];
        const setKey = resolveSetKey(doors);
        const bigDoorFace = findDoor(doors, DoorType.Big)?.face ?? DEFAULT_BIG_DOOR_FACE;

        const update = (nextSetKey: DoorSetKey, nextFace: DoorFace) => {
          field.onChange(buildDoors(nextSetKey, nextFace));
          form.clearErrors('doors');
        };

        const toggleFacePicker = (event: {
          preventDefault: () => void;
          stopPropagation: () => void;
        }) => {
          // ToggleGroup'un kendi seçimini tetiklememesi için olay burada durur;
          // ikon yalnızca yüz seçicisini açar.
          event.preventDefault();
          event.stopPropagation();
          setOpenFacePicker((prev) => !prev);
        };

        return (
          <FormItem className="space-y-3">
            <ToggleGroup
              type="single"
              value={setKey ?? ''}
              onValueChange={(val) => {
                if (!val) return;
                // Yüz seçimi kullanıcı açıkça değiştirmediği sürece korunur;
                // hiç seçilmediyse origin'e değmeyen yüz uygulanır.
                update(val as DoorSetKey, bigDoorFace);
              }}
              className="flex gap-2"
            >
              {DOOR_SET_OPTIONS.map((option) => {
                const isSelected = setKey === option.value;
                const showFacePicker = isSelected && option.hasBigDoor;

                return (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    aria-label={option.label}
                    className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {option.label}

                    {showFacePicker && (
                      <Popover open={openFacePicker} onOpenChange={setOpenFacePicker}>
                        <PopoverTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Büyük kapının tarafını seç"
                            className="inline-flex cursor-pointer rounded p-0.5 hover:bg-primary/15"
                            onClick={toggleFacePicker}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              toggleFacePicker(event);
                            }}
                          >
                            <Settings2 className="h-4 w-4" />
                          </span>
                        </PopoverTrigger>

                        <PopoverContent className="w-44 space-y-2.5" align="center">
                          <p className="text-sm font-medium">Kapı yönü</p>

                          <RadioGroup
                            value={bigDoorFace}
                            onValueChange={(face) => {
                              update(option.value, face as DoorFace);
                              setOpenFacePicker(false);
                            }}
                            className="gap-2"
                          >
                            {BIG_DOOR_FACE_OPTIONS.map((face) => (
                              <label
                                key={face.value}
                                htmlFor={`big-door-${face.value}`}
                                className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 hover:bg-muted"
                              >
                                <RadioGroupItem id={`big-door-${face.value}`} value={face.value} />
                                <span className="text-sm">{face.label}</span>
                              </label>
                            ))}
                          </RadioGroup>
                        </PopoverContent>
                      </Popover>
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>

            {/* Bölge ayrımı referans kapıya bağlıdır: küçük kapı yoksa LIFO
                kriteri sessizce etkisiz kalır, kullanıcı bunu önden bilmeli. */}
            {setKey === 'big' && (
              <p className="text-sm text-muted-foreground">
                Küçük kapı olmadan yükleme sırası LIFO bölgelerine ayrılamaz; plan oluştururken LIFO
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
