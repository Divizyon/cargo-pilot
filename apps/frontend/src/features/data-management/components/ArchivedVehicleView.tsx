import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Vehicle } from '@/lib/types/vehicle';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay, formatWeightDisplay } from '@/lib/utils/unitConversion';
import { VehicleAuditSection } from './VehicleAuditSection';

const DOOR_LABELS: Record<string, string> = {
  rear: 'Arka',
  side: 'Yan',
  top: 'Üst',
};

interface Props {
  vehicle: Vehicle;
}

export function ArchivedVehicleView({ vehicle }: Props) {
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{vehicle.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Araç Tipi</dt>
          <dd>{vehicle.vehicleType}</dd>

          <dt className="text-muted-foreground">Plaka / Seri No</dt>
          <dd>{vehicle.plate ?? vehicle.serialNumber ?? '—'}</dd>

          <dt className="text-muted-foreground">Boyutlar (U×G×Y)</dt>
          <dd>
            {formatDimensionDisplay(vehicle.length, dimensionUnit)} ×{' '}
            {formatDimensionDisplay(vehicle.width, dimensionUnit)} ×{' '}
            {formatDimensionDisplay(vehicle.height, dimensionUnit)}
          </dd>

          <dt className="text-muted-foreground">Maks Kargo</dt>
          <dd>{formatWeightDisplay(vehicle.maxCargoWeight, weightUnit)}</dd>

          {vehicle.tareWeight !== undefined && (
            <>
              <dt className="text-muted-foreground">Boş Ağırlık</dt>
              <dd>{formatWeightDisplay(vehicle.tareWeight, weightUnit)}</dd>
            </>
          )}

          <dt className="text-muted-foreground">Kapı Yönü</dt>
          <dd>{DOOR_LABELS[vehicle.doorDirection] ?? vehicle.doorDirection}</dd>
        </dl>

        <VehicleAuditSection
          createdAt={vehicle.createdAt}
          createdBy={vehicle.createdBy}
          updatedAt={vehicle.updatedAt}
          updatedBy={vehicle.updatedBy}
        />
      </CardContent>
    </Card>
  );
}
