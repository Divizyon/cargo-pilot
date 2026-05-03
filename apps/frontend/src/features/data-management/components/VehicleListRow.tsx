import { Pencil, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';

const TYPE_COLORS: Record<VehicleType, string> = {
  Tir: 'text-blue-600',
  Kamyon: 'text-gray-500',
  Romork: 'text-amber-600',
  Konteyner: 'text-sky-600',
};

const TYPE_LABELS: Record<VehicleType, string> = {
  Tir: 'Tır',
  Kamyon: 'Kamyon',
  Romork: 'Römork',
  Konteyner: 'Konteyner',
};

function TirIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="9" y1="4" x2="9" y2="17" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
    </svg>
  );
}

function RomorkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="18" height="13" rx="1" />
      <line x1="19" y1="10" x2="23" y2="10" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="14" cy="19" r="1.8" />
    </svg>
  );
}

function KonteynerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="22" height="16" rx="1" />
      <line x1="7" y1="3" x2="7" y2="19" />
      <line x1="13" y1="3" x2="13" y2="19" />
      <line x1="19" y1="3" x2="19" y2="19" />
    </svg>
  );
}

const TYPE_ICONS: Record<VehicleType, typeof TirIcon> = {
  Tir: TirIcon,
  Kamyon: KamyonIcon,
  Romork: RomorkIcon,
  Konteyner: KonteynerIcon,
};

const DOOR_STYLE: Record<string, string> = {
  rear: 'border border-border text-foreground',
  side: 'border border-green-300 bg-green-50 text-green-700',
  top: 'border border-blue-300 bg-blue-50 text-blue-700',
};

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

function cmToM(cm: number): string {
  return `${(cm / 100).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  vehicle: Vehicle;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

export function VehicleListRow({ vehicle, onDelete, onDetail }: Props) {
  const Icon = TYPE_ICONS[vehicle.vehicleType] ?? KamyonIcon;
  const colorClass = TYPE_COLORS[vehicle.vehicleType] ?? 'text-gray-500';
  const doorStyle = DOOR_STYLE[vehicle.doorDirection] ?? DOOR_STYLE.rear;
  const tons = (vehicle.maxCargoWeight / 1000).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const kg = vehicle.maxCargoWeight.toLocaleString('tr-TR');

  return (
    <TableRow
      className="cursor-pointer border-b hover:bg-gray-50/60"
      onClick={() => onDetail(vehicle)}
    >
      <TableCell className="py-4 font-medium text-foreground">{vehicle.name}</TableCell>

      <TableCell className="py-4">
        <span className={cn('flex items-center gap-1.5 text-sm font-medium', colorClass)}>
          <Icon className="h-4 w-4" />
          {TYPE_LABELS[vehicle.vehicleType]}
        </span>
      </TableCell>

      <TableCell className="py-4 text-sm text-muted-foreground">
        {formatDate(vehicle.createdAt)}
      </TableCell>

      <TableCell className="py-4">
        <span className={cn('rounded-md px-2.5 py-1 text-xs font-medium', doorStyle)}>
          {DOOR_LABELS[vehicle.doorDirection] ?? vehicle.doorDirection}
        </span>
      </TableCell>

      <TableCell className="py-4 text-sm text-foreground">{cmToM(vehicle.length)}</TableCell>
      <TableCell className="py-4 text-sm text-foreground">{cmToM(vehicle.width)}</TableCell>
      <TableCell className="py-4 text-sm text-foreground">{cmToM(vehicle.height)}</TableCell>

      <TableCell className="py-4">
        <p className="text-sm font-semibold text-foreground">{tons} t</p>
        <p className="text-xs text-muted-foreground">{kg} kg</p>
      </TableCell>

      <TableCell className="py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onDetail(vehicle); }}
            aria-label="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
            onClick={(e) => { e.stopPropagation(); onDelete(vehicle); }}
            aria-label="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
}
