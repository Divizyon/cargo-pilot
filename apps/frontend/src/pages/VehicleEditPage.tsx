import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import { useUpdateVehicle } from '@/lib/api/useVehicles';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';

interface EditLocationState {
  vehicle: Vehicle;
}

function buildDefaultsFromVehicle(v: Vehicle): Partial<VehicleFormValues> {
  return {
    vehicleType: v.vehicleType,
    name: v.name,
    description: v.description,
    plate: v.vehicleType !== 'Konteyner' ? (v.plate ?? '') : undefined,
    serialNumber: v.vehicleType === 'Konteyner' ? (v.serialNumber ?? '') : undefined,
    length: v.length,
    width: v.width,
    height: v.height,
    maxCargoWeight: v.maxCargoWeight,
    grossWeight: v.grossWeight,
    tareWeight: v.tareWeight,
    maxLayerCount: v.maxLayerCount,
    doorDirection: v.doorDirection,
    doorSide: v.doorSide,
    isActive: v.isActive,
    status: v.status,
  };
}

export function VehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: updateVehicle, isPending } = useUpdateVehicle();

  const locationState = location.state as EditLocationState | null;
  const vehicle = locationState?.vehicle ?? null;

  if (!vehicle) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="text-sm text-destructive">
          Araç bilgisi bulunamadı. Lütfen listeden tekrar açın.
        </p>
        <Button variant="outline" className="w-fit" onClick={() => navigate('/vehicles')}>
          Listeye Dön
        </Button>
      </div>
    );
  }

  const defaultValues = buildDefaultsFromVehicle(vehicle);

  function handleSubmit(values: VehicleFormValues) {
    if (!id) return;
    updateVehicle({ id, data: values }, { onSuccess: () => navigate('/vehicles') });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Araç Düzenle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.name} — teknik verilerini ve boyutlarını güncelleyin.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vehicles')}
            disabled={isPending}
          >
            İptal Et
          </Button>
          <Button type="submit" form="vehicle-form" disabled={isPending}>
            {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </div>

      <VehicleForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vehicles')}
        isSubmitting={isPending}
        disableSubmitWhenPristine
      />
    </div>
  );
}
