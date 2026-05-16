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
import { useDeleteItem } from '@/lib/api/useItems';
import type { Item } from '@/lib/types/item';

interface Props {
  item: Item | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ProductDeleteDialog({ item, onClose, onDeleted }: Props) {
  const { mutate: deleteItem, isPending } = useDeleteItem();

  function handleDelete() {
    if (!item) return;
    deleteItem(item.id, {
      onSuccess: () => {
        onClose();
        onDeleted?.();
      },
    });
  }

  return (
    <AlertDialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ürünü Sil</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{item?.name}</strong> ürününü silmek istediğinizden emin misiniz? Bu işlem geri
            alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Vazgeç</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={isPending}
          >
            Sil
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
