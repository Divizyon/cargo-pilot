import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { ProductTable } from '@/features/data-management/components/ProductTable';
import { useCreateItem } from '@/lib/api/useItems';

export function ProductsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createItem = useCreateItem();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ürün Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yükleme planında kullanılacak tüm birimlerin teknik verilerinin yönetildiği merkezdir.
        </p>
      </div>

      <ProductTable onCreateClick={() => setIsCreateOpen(true)} />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Ürün Ekle</DialogTitle>
            <DialogDescription>
              Ürünün kimliğini, fiziksel özelliklerini ve kısıtlarını tanımlayın.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            isSubmitting={createItem.isPending}
            onCancel={() => setIsCreateOpen(false)}
            onSubmit={(values) =>
              createItem.mutate(values, {
                onSuccess: () => setIsCreateOpen(false),
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
