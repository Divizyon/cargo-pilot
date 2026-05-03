import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVehicle, useUpdateVehicle } from '@/lib/api/useVehicles';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { Skeleton } from '@/components/ui/skeleton';

export function VehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading, isError } = useVehicle(id ?? '');
  const { mutate: updateVehicle, isPending } = useUpdateVehicle();

  function handleSubmit(values: VehicleFormValues) {
    if (!id) return;
    updateVehicle(
      { id, data: values },
      {
        onSuccess: () => {
          toast.success('Araç başarıyla güncellendi.');
          navigate('/vehicles');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="text-sm text-destructive">Araç yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Araç Detayı</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {vehicle.name} — teknik verilerini ve boyutlarını görüntüleyin veya güncelleyin.
        </p>
      </div>
      <VehicleForm
        defaultValues={vehicle as unknown as VehicleFormValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vehicles')}
        isSubmitting={isPending}
        disableSubmitWhenPristine
      />
    </div>
  );
}
