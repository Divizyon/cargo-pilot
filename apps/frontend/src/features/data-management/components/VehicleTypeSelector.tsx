import { VehicleType, type VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function TirIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="5" width="6" height="11" rx="1" />
      <line x1="1" y1="9" x2="7" y2="9" />
      <rect x="7" y="3" width="16" height="13" rx="1" />
      <circle cx="4" cy="18.5" r="1.8" />
      <circle cx="14" cy="18.5" r="1.8" />
      <circle cx="19" cy="18.5" r="1.8" />
    </svg>
  );
}

function KamyonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="9" y1="4" x2="9" y2="17" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
    </svg>
  );
}

function KamposetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="18" height="13" rx="1" />
      <line x1="19" y1="10" x2="23" y2="10" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="14" cy="19" r="1.8" />
    </svg>
  );
}

function KonteynerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="22" height="16" rx="1" />
      <line x1="7" y1="3" x2="7" y2="19" />
      <line x1="13" y1="3" x2="13" y2="19" />
      <line x1="19" y1="3" x2="19" y2="19" />
    </svg>
  );
}

const VEHICLE_OPTIONS = [
  { value: VehicleType.Tir, label: 'Tır', icon: TirIcon },
  { value: VehicleType.Kamyon, label: 'Kamyon', icon: KamyonIcon },
  { value: VehicleType.Kamposet, label: 'Römork', icon: KamposetIcon },
  { value: VehicleType.Konteyner, label: 'Konteyner', icon: KonteynerIcon },
] as const;

interface VehicleTypeSelectorProps {
  value: VehicleTypeValue | undefined;
  onChange: (value: VehicleTypeValue) => void;
}

export function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? ''}
      onValueChange={(val) => {
        if (val) onChange(val as VehicleTypeValue);
      }}
      className="flex gap-2"
    >
      {VEHICLE_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => (
        <ToggleGroupItem
          key={optionValue}
          value={optionValue}
          aria-label={label}
          className="h-12 flex-1 flex-row gap-2.5 rounded-md px-4 text-sm font-medium text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
