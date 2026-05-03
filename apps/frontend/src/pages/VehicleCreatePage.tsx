import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import { useCreateVehicle } from '@/lib/api/useVehicles';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';

interface CopyFromState {
  copyFrom: Vehicle;
  name: string;
}

function buildDefaultsFromCopy(state: CopyFromState): Partial<VehicleFormValues> {
  const { copyFrom, name } = state;
  return {
    vehicleType: copyFrom.vehicleType,
    name,
    description: copyFrom.description,
    plate: copyFrom.vehicleType !== 'Konteyner' ? (copyFrom.plate ?? '') : undefined,
    serialNumber: copyFrom.vehicleType === 'Konteyner' ? (copyFrom.serialNumber ?? '') : undefined,
    length: copyFrom.length,
    width: copyFrom.width,
    height: copyFrom.height,
    maxCargoWeight: copyFrom.maxCargoWeight,
    grossWeight: copyFrom.grossWeight,
    tareWeight: copyFrom.tareWeight,
    maxLayerCount: copyFrom.maxLayerCount,
    doorDirection: copyFrom.doorDirection,
    doorSide: copyFrom.doorSide,
    isActive: copyFrom.isActive,
    status: copyFrom.status,
  };
}

export function VehicleCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const createVehicle = useCreateVehicle();

  const locationState = location.state as CopyFromState | null;
  const defaultValues = locationState?.copyFrom ? buildDefaultsFromCopy(locationState) : undefined;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Yeni Araç Ekle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Araç tipini, kimlik bilgilerini ve özelliklerini tanımlayın.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vehicles')}
            disabled={createVehicle.isPending}
          >
            İptal Et
          </Button>
          <Button type="submit" form="vehicle-form" disabled={createVehicle.isPending}>
            {createVehicle.isPending ? 'Kaydediliyor...' : 'Aracı Kaydet'}
          </Button>
        </div>
      </div>

      <VehicleForm
        defaultValues={defaultValues}
        isSubmitting={createVehicle.isPending}
        onCancel={() => navigate('/vehicles')}
        onSubmit={(values) =>
          createVehicle.mutate(values, {
            onSuccess: () => navigate('/vehicles'),
          })
        }
        onDraftSubmit={(values) =>
          createVehicle.mutate(values as VehicleFormValues, {
            onSuccess: () => navigate('/vehicles'),
          })
        }
      />
    </div>
  );
}
