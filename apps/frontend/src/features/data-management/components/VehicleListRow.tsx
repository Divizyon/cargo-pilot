import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Truck, Container, Pencil, Trash2 } from 'lucide-react';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay, formatWeightDisplay } from '@/lib/utils/unitConversion';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { VehicleFavoriteButton } from './VehicleFavoriteButton';
import { VehicleAuditInfo } from './VehicleAuditInfo';

const TYPE_ICONS: Record<VehicleType, ReactNode> = {
  Tir: <Truck className="h-3.5 w-3.5" />,
  Kamyon: <Truck className="h-3.5 w-3.5" />,
  Kamposet: <Truck className="h-3.5 w-3.5" />,
  Konteyner: <Container className="h-3.5 w-3.5" />,
};

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

const cell = 'py-0 px-3';

interface Props {
  vehicle: Vehicle;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

export function VehicleListRow({ vehicle, onDelete, onDetail }: Props) {
  const navigate = useNavigate();
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <TableRow className="h-12 cursor-pointer" onClick={() => onDetail(vehicle)}>
      <TableCell className={cell} onClick={(e) => e.stopPropagation()}>
        <VehicleFavoriteButton vehicleId={vehicle.id} isFavorite={vehicle.isFavorite} />
      </TableCell>
      <TableCell className={cell}>
        <VehicleAuditInfo
          createdAt={vehicle.createdAt}
          createdBy={vehicle.createdBy}
          updatedAt={vehicle.updatedAt}
          updatedBy={vehicle.updatedBy}
        >
          <span className="text-xs font-medium text-foreground">{vehicle.name}</span>
        </VehicleAuditInfo>
      </TableCell>
      <TableCell className={cell}>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {TYPE_ICONS[vehicle.vehicleType]}
          <span className="text-xs">{vehicle.vehicleType}</span>
        </div>
      </TableCell>
      <TableCell className={cell}>
        <span className="text-xs text-muted-foreground">
          {DOOR_LABELS[vehicle.doorDirection] ?? vehicle.doorDirection}
        </span>
      </TableCell>
      <TableCell className={cell}>
        <span className="font-mono text-xs text-muted-foreground">
          {formatDimensionDisplay(vehicle.length, dimensionUnit)} ×{' '}
          {formatDimensionDisplay(vehicle.width, dimensionUnit)} ×{' '}
          {formatDimensionDisplay(vehicle.height, dimensionUnit)}
        </span>
      </TableCell>
      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatWeightDisplay(vehicle.maxCargoWeight, weightUnit)}
        </span>
      </TableCell>
      <TableCell className={cell}>
        <VehicleStatusBadge isActive={vehicle.isActive ?? true} status={vehicle.status} />
      </TableCell>
      <TableCell className={cell} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            title="Düzenle"
            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => navigate(`/vehicles/${vehicle.id}/edit`, { state: { vehicle } })}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sil"
            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-destructive"
            onClick={() => onDelete(vehicle)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
