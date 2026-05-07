import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDuplicateVehicle } from '@/lib/api/useVehicles';
import type { Vehicle } from '@/lib/types/vehicle';

const duplicateSchema = z.object({
  vehicleName: z.string().min(1, 'Araç adı zorunludur.').max(200),
  plateNumber: z.string().min(1, 'Plaka zorunludur.').max(50),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

interface Props {
  vehicle: Vehicle | null;
  onClose: () => void;
  onDuplicated: (newId: string) => void;
}

export function VehicleDuplicateDialog({ vehicle, onClose, onDuplicated }: Props) {
  const { mutate: duplicate, isPending } = useDuplicateVehicle();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { vehicleName: '', plateNumber: '' },
  });

  useEffect(() => {
    if (vehicle) {
      reset({ vehicleName: `${vehicle.name} - Kopya`, plateNumber: '' });
    }
  }, [vehicle, reset]);

  function onSubmit(values: DuplicateFormValues) {
    if (!vehicle) return;
    duplicate(
      { id: vehicle.id, vehicleName: values.vehicleName, plateNumber: values.plateNumber },
      {
        onSuccess: (newVehicle) => {
          toast.success('Araç başarıyla kopyalandı.');
          onClose();
          if (newVehicle) onDuplicated(newVehicle.id);
        },
        onError: () => {
          toast.error('Araç kopyalanırken hata oluştu.');
        },
      },
    );
  }

  return (
    <Dialog open={Boolean(vehicle)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Aracı Kopyala
          </DialogTitle>
          <DialogDescription>
            Yeni aracın adını ve plakasını girin. Kaydettikten sonra düzenleme ekranına
            yönlendirileceksiniz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="dup-name">Araç Adı</Label>
            <Input id="dup-name" {...register('vehicleName')} />
            {errors.vehicleName && (
              <p className="text-xs text-destructive">{errors.vehicleName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-plate">Plaka</Label>
            <Input id="dup-plate" {...register('plateNumber')} placeholder="34 ABC 123" autoFocus />
            {errors.plateNumber && (
              <p className="text-xs text-destructive">{errors.plateNumber.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Kopyalanıyor…' : 'Kopyala'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
