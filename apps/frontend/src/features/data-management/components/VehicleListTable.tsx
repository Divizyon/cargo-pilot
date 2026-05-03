import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import type { Vehicle } from '@/lib/types/vehicle';
import { VehicleListRow } from './VehicleListRow';

interface Props {
  vehicles: Vehicle[];
  isLoading: boolean;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

export function VehicleListTable({ vehicles, isLoading, onDelete, onDetail }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>İsim</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Kapı Yönü</TableHead>
            <TableHead>Boyutlar (U×G×Y)</TableHead>
            <TableHead>Maks Kargo</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                Araç bulunamadı.
              </TableCell>
            </TableRow>
          ) : (
            vehicles.map((v) => (
              <VehicleListRow key={v.id} vehicle={v} onDelete={onDelete} onDetail={onDetail} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
