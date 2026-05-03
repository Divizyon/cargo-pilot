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
    <div className="rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="border-b hover:bg-transparent">
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              İsim
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tip
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Oluşturuldu
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kapı Yönü
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Uzunluk
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Genişlik
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Yükseklik
            </TableHead>
            <TableHead className="py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Max Yük
            </TableHead>
            <TableHead className="w-20 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              İşlem
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 9 }).map((__, j) => (
                  <TableCell key={j} className="py-4">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : vehicles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-16 text-center text-sm text-muted-foreground">
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
