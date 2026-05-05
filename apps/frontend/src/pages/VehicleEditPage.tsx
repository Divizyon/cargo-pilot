import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import type { Vehicle } from '@/lib/types/vehicle';
import { useVehicle, useUpdateVehicle } from '@/lib/api/useVehicles';
import { vehicleToFormValues } from '@/lib/api/vehicleMappers';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import { VehicleDeleteDialog } from '@/features/data-management/components/VehicleDeleteDialog';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function VehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const vehicleFromState = (location.state as { vehicle?: Vehicle } | null)?.vehicle;
  const { data: vehicle, isLoading, isError } = useVehicle(id ?? '', vehicleFromState);
  const { mutate: updateVehicle, isPending } = useUpdateVehicle();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Araç Detayı</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle.name} — teknik verilerini ve boyutlarını görüntüleyin veya güncelleyin.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs text-destructive hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Aracı Sil
        </Button>
      </div>

      <VehicleForm
        defaultValues={vehicleToFormValues(vehicle) as VehicleFormValues}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vehicles')}
        isSubmitting={isPending}
        disableSubmitWhenPristine
      />

      <VehicleDeleteDialog
        vehicle={showDeleteDialog ? vehicle : null}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => navigate('/vehicles')}
      />
    </div>
  );
}
