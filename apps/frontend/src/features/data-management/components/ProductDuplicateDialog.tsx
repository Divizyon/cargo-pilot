import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useDuplicateItem } from '@/lib/api/useItems';
import type { Item } from '@/lib/types/item';

const duplicateSchema = z.object({
  name: z.string().min(1, 'Ürün adı zorunludur.').max(200),
  sku: z.string().min(1, 'SKU zorunludur.').max(100),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

interface Props {
  item: Item | null;
  onClose: () => void;
  onDuplicated: (newId: string) => void;
}

export function ProductDuplicateDialog({ item, onClose, onDuplicated }: Props) {
  const { mutate: duplicate, isPending } = useDuplicateItem();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { name: '', sku: '' },
  });

  useEffect(() => {
    if (item) {
      reset({ name: `${item.name} - Kopya`, sku: `${item.sku}-kopya` });
    }
  }, [item, reset]);

  function onSubmit(values: DuplicateFormValues) {
    if (!item) return;
    duplicate(
      { id: item.id, name: values.name, sku: values.sku },
      {
        onSuccess: (newItem) => {
          onClose();
          if (newItem) onDuplicated(newItem.id);
        },
        onError: () => {},
      },
    );
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Ürünü Kopyala
          </DialogTitle>
          <DialogDescription>
            Yeni ürünün adını ve SKU'sunu girin. Kaydettikten sonra düzenleme ekranına
            yönlendirileceksiniz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="dup-name">Ürün Adı</Label>
            <Input id="dup-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dup-sku">SKU</Label>
            <Input id="dup-sku" {...register('sku')} autoFocus />
            {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
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
