import { MoreHorizontal, Pencil, Eye, Trash2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Vehicle } from '@/lib/types/vehicle';

interface Props {
  vehicle: Vehicle;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

export function VehicleActionMenu({ vehicle, onDelete, onDetail }: Props) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">İşlemler</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onDetail(vehicle)}>
          <Eye className="mr-2 h-4 w-4" />
          Detay
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Düzenle
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            navigate('/vehicles/new', {
              state: { copyFrom: vehicle, name: `${vehicle.name} - Kopya` },
            })
          }
        >
          <Copy className="mr-2 h-4 w-4" />
          Kopyala
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(vehicle)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
