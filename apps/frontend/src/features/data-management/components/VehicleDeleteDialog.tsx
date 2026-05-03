import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDeleteVehicle, useArchiveVehicle, useVehiclePlans } from '@/lib/api/useVehicles';
import type { Vehicle } from '@/lib/types/vehicle';

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
}

export function VehicleDeleteDialog({ vehicle, onClose }: Props) {
  const { mutate: deleteVehicle, isPending: isDeleting } = useDeleteVehicle();
  const { mutate: archiveVehicle, isPending: isArchiving } = useArchiveVehicle();
  const { data: plans } = useVehiclePlans(vehicle?.id ?? '');

  const hasActivePlans = plans?.some((p) => p.isActive) ?? false;

  function handleDelete() {
    if (!vehicle) return;
    deleteVehicle(vehicle.id, {
      onSuccess: () => {
        toast.success('Araç başarıyla silindi.');
        onClose();
      },
    });
  }

  function handleArchive() {
    if (!vehicle) return;
    archiveVehicle(vehicle.id, {
      onSuccess: () => {
        toast.success('Araç pasife alındı.');
        onClose();
      },
    });
  }

  return (
    <AlertDialog open={Boolean(vehicle)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aracı Sil</AlertDialogTitle>
          <AlertDialogDescription>
            {hasActivePlans ? (
              'Bu araç aktif bir planda kullanılmaktadır. Önce atamayı kaldırın.'
            ) : (
              <>
                <strong>{vehicle?.name}</strong> aracını silmek istediğinizden emin misiniz? Bu
                işlem geri alınamaz.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Vazgeç</AlertDialogCancel>
          {!hasActivePlans && (
            <>
              <Button variant="outline" onClick={handleArchive} disabled={isArchiving}>
                Pasife Al
              </Button>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                Sil
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
