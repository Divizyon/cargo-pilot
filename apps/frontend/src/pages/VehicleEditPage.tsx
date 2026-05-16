import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVehicle, useUpdateVehicle } from '@/lib/api/useVehicles';
import { vehicleToFormValues } from '@/lib/api/vehicleMappers';
import { VehicleForm } from '@/features/data-management/components/VehicleForm';
import { VehicleDeleteDialog } from '@/features/data-management/components/VehicleDeleteDialog';
import { VehicleDuplicateDialog } from '@/features/data-management/components/VehicleDuplicateDialog';
import type { VehicleFormValues } from '@/features/data-management/schemas/vehicleSchema';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';

export function VehicleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading } = useVehicle(id ?? '');
  const { mutate: updateVehicle, isPending } = useUpdateVehicle();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  function handleSubmit(values: VehicleFormValues) {
    if (!id) return;
    updateVehicle(
      { id, data: { ...values, status: 'active' } },
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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-destructive">Araç yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Detayı</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {vehicle.name} — teknik verilerini ve boyutlarını görüntüleyin veya güncelleyin.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowDuplicateDialog(true)}
          >
            <Copy className="h-3.5 w-3.5" />
            Kopyala
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive hover:border-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Aracı Sil
          </Button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <VehicleForm
          key={vehicle.updatedAt ?? vehicle.id}
          defaultValues={vehicleToFormValues(vehicle) as VehicleFormValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/vehicles')}
          isSubmitting={isPending}
          disableSubmitWhenPristine={vehicle.status !== 'draft'}
          vehicle={vehicle}
        />
      </div>

      <VehicleDeleteDialog
        vehicle={showDeleteDialog ? vehicle : null}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => navigate('/vehicles')}
      />

      <VehicleDuplicateDialog
        vehicle={showDuplicateDialog ? vehicle : null}
        onClose={() => setShowDuplicateDialog(false)}
        onDuplicated={(newId) => navigate(`/vehicles/${newId}/edit`)}
      />
    </div>
  );
}
