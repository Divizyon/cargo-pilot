import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useVehicle } from '@/lib/api/useVehicles';
import { VehicleAuditSection } from './VehicleAuditSection';
import { VehicleStatusBadge } from './VehicleStatusBadge';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

interface Props {
  vehicleId: string | null;
  onClose: () => void;
}

export function VehicleDetailPanel({ vehicleId, onClose }: Props) {
  const navigate = useNavigate();
  const { data: vehicle, isLoading } = useVehicle(vehicleId ?? '');

  return (
    <Sheet open={Boolean(vehicleId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isLoading ? <Skeleton className="h-6 w-48" /> : vehicle?.name}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 space-y-3 p-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : vehicle ? (
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Araç Tipi</dt>
              <dd className="font-medium">{vehicle.vehicleType}</dd>

              <dt className="text-muted-foreground">Plaka / Seri No</dt>
              <dd className="font-medium">{vehicle.plate ?? vehicle.serialNumber ?? '—'}</dd>

              <dt className="text-muted-foreground">Boyutlar (U×G×Y)</dt>
              <dd className="font-medium">
                {vehicle.length} × {vehicle.width} × {vehicle.height} cm
              </dd>

              <dt className="text-muted-foreground">Maks Kargo</dt>
              <dd className="font-medium">{vehicle.maxCargoWeight.toLocaleString('tr-TR')} kg</dd>

              {vehicle.tareWeight !== undefined && (
                <>
                  <dt className="text-muted-foreground">Boş Ağırlık</dt>
                  <dd className="font-medium">{vehicle.tareWeight.toLocaleString('tr-TR')} kg</dd>
                </>
              )}

              <dt className="text-muted-foreground">Kapı Yönü</dt>
              <dd className="font-medium">{DOOR_LABELS[vehicle.doorDirection] ?? vehicle.doorDirection}</dd>

              {vehicle.maxLayerCount && (
                <>
                  <dt className="text-muted-foreground">Maks Kat</dt>
                  <dd className="font-medium">{vehicle.maxLayerCount}</dd>
                </>
              )}

              <dt className="text-muted-foreground">Durum</dt>
              <dd>
                <VehicleStatusBadge isActive={vehicle.isActive ?? true} status={vehicle.status} />
              </dd>
            </dl>

            {vehicle.description && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Açıklama</p>
                <p>{vehicle.description}</p>
              </div>
            )}

            <Separator />

            <VehicleAuditSection
              createdAt={vehicle.createdAt}
              createdBy={vehicle.createdBy}
              updatedAt={vehicle.updatedAt}
              updatedBy={vehicle.updatedBy}
            />
          </div>
        ) : null}

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
          {vehicle && (
            <Button onClick={() => { onClose(); navigate(`/vehicles/${vehicle.id}/edit`); }}>
              Düzenle
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
