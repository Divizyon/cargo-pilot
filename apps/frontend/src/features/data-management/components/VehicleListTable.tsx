import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/lib/types/vehicle';
import { VehicleListRow } from './VehicleListRow';

interface Props {
  vehicles: Vehicle[];
  isLoading: boolean;
  onDelete: (vehicle: Vehicle) => void;
  onDetail: (vehicle: Vehicle) => void;
}

const SKELETON_COL_WIDTHS = ['w-8', 'w-36', 'w-24', 'w-20', 'w-36', 'w-24', 'w-20', 'w-8'];
const head = 'py-0 px-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap';

export function VehicleListTable({ vehicles, isLoading, onDelete, onDetail }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <Table className="min-w-[860px]">
        <TableHeader>
          <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
            <TableHead className={cn(head, 'w-10')} />
            <TableHead className={cn(head, 'w-44')}>İsim</TableHead>
            <TableHead className={cn(head, 'w-24')}>Tip</TableHead>
            <TableHead className={cn(head, 'w-24')}>Kapı Yönü</TableHead>
            <TableHead className={cn(head, 'w-36')}>Boyutlar (U×G×Y)</TableHead>
            <TableHead className={cn(head, 'w-28')}>Maks Kargo</TableHead>
            <TableHead className={cn(head, 'w-24')}>Durum</TableHead>
            <TableHead className={cn(head, 'w-16')}>İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="h-12 hover:bg-transparent">
                {SKELETON_COL_WIDTHS.map((w, j) => (
                  <TableCell key={j} className="py-0 px-3">
                    <Skeleton className={cn('h-3', w)} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : vehicles.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
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
