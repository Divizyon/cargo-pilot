import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { VehicleType, type VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';

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
  { value: VehicleType.Kamposet, label: 'Kamposet', icon: KamposetIcon },
  { value: VehicleType.Konteyner, label: 'Konteyner', icon: KonteynerIcon },
] as const;

interface VehicleTypeSelectorProps {
  value: VehicleTypeValue | undefined;
  onChange: (value: VehicleTypeValue) => void;
}

export function VehicleTypeSelector({ value, onChange }: VehicleTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {VEHICLE_OPTIONS.map(({ value: optionValue, label, icon: Icon }) => (
        <Card
          key={optionValue}
          className={cn(
            'cursor-pointer flex flex-col items-center justify-center gap-2 p-2.5 transition-colors hover:bg-muted/50',
            value === optionValue && 'ring-2 ring-primary',
          )}
          onClick={() => onChange(optionValue)}
        >
          <Icon className="h-7 w-7" />
          <span className="text-xs font-medium">{label}</span>
        </Card>
      ))}
    </div>
  );
}
