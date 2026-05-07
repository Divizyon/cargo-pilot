import { useNavigate } from 'react-router-dom';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import { useCreateVehicle } from '@/lib/api/useVehicles';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';

export function VehicleCreatePage() {
  const navigate = useNavigate();
  const createVehicle = useCreateVehicle();

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Yeni Araç Ekle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Araç tipini, kimlik bilgilerini ve özelliklerini tanımlayın.
        </p>
      </div>

      <VehicleForm
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
  );
}
