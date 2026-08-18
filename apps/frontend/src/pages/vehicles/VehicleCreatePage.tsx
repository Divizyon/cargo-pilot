import { useNavigate } from 'react-router-dom';
import { VehicleForm } from '@/features/data-management/vehicles/components/VehicleForm';
import { useCreateVehicle } from '@/lib/api/useVehicles';
import { DoorType, DoorFace } from '@/lib/types/vehicle';
import type { VehicleFormValues } from '@/features/data-management/vehicles/schemas/vehicleSchema';

export function VehicleCreatePage() {
  const navigate = useNavigate();
  const createVehicle = useCreateVehicle();

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Yeni Araç Ekle</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Araç tipini, kimlik bilgilerini ve özelliklerini tanımlayın.
          </p>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <VehicleForm
          isCreateMode
          defaultValues={{
            vehicleType: 'Konteyner',
            length: 1200,
            width: 240,
            height: 260,
            doors: [{ type: DoorType.Small, face: DoorFace.LengthZ }],
          }}
          isSubmitting={createVehicle.isPending}
          onCancel={() => navigate('/vehicles')}
          onSubmit={(values) =>
            createVehicle.mutate(values, {
              onSuccess: () => navigate('/vehicles'),
            })
          }
          onDraftSubmit={(values) =>
            createVehicle.mutate({ ...values, status: 'draft' } as VehicleFormValues, {
              onSuccess: () => navigate('/vehicles'),
            })
          }
        />
      </div>
    </div>
  );
}
