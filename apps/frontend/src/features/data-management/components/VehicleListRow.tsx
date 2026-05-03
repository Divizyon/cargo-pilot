import type { ReactNode } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Truck, Container } from 'lucide-react';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { VehicleFavoriteButton } from './VehicleFavoriteButton';
import { VehicleActionMenu } from './VehicleActionMenu';
import { VehicleAuditInfo } from './VehicleAuditInfo';

const TYPE_ICONS: Record<VehicleType, ReactNode> = {
  Tir: <Truck className="h-4 w-4" />,
  Kamyon: <Truck className="h-4 w-4" />,
  Romork: <Truck className="h-4 w-4" />,
  Konteyner: <Container className="h-4 w-4" />,
};

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

interface Props {
  vehicle: Vehicle;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

export function VehicleListRow({ vehicle, onDelete, onDetail }: Props) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onDetail(vehicle)}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <VehicleFavoriteButton vehicleId={vehicle.id} isFavorite={vehicle.isFavorite} />
      </TableCell>
      <TableCell className="font-medium">
        <VehicleAuditInfo
          createdAt={vehicle.createdAt}
          createdBy={vehicle.createdBy}
          updatedAt={vehicle.updatedAt}
          updatedBy={vehicle.updatedBy}
        >
          <span>{vehicle.name}</span>
        </VehicleAuditInfo>
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5">
          {TYPE_ICONS[vehicle.vehicleType]}
          {vehicle.vehicleType}
        </span>
      </TableCell>
      <TableCell>{DOOR_LABELS[vehicle.doorDirection] ?? vehicle.doorDirection}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {vehicle.length} × {vehicle.width} × {vehicle.height} cm
      </TableCell>
      <TableCell>{vehicle.maxCargoWeight.toLocaleString('tr-TR')} kg</TableCell>
      <TableCell>
        <VehicleStatusBadge isActive={vehicle.isActive ?? true} status={vehicle.status} />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <VehicleActionMenu vehicle={vehicle} onDelete={onDelete} onDetail={onDetail} />
      </TableCell>
    </TableRow>
  );
}
