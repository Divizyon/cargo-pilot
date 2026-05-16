import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Trash2 } from 'lucide-react';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { ProductDeleteDialog } from '@/features/data-management/components/ProductDeleteDialog';
import { ProductDuplicateDialog } from '@/features/data-management/components/ProductDuplicateDialog';
import { useItem, useUpdateItem } from '@/lib/api/useItems';
import { itemToFormValues } from '@/lib/api/itemMappers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, isError } = useItem(id ?? '');
  const updateItem = useUpdateItem();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

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

  if (isError || !item) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-destructive">Ürün yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Ürün Detayı</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.name} — fiziksel özelliklerini ve kısıtlarını görüntüleyin veya güncelleyin.
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
            Ürünü Sil
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ProductForm
          defaultValues={itemToFormValues(item)}
          isSubmitting={updateItem.isPending}
          disableSubmitWhenPristine
          onCancel={() => navigate('/products')}
          onSubmit={(values) =>
            updateItem.mutate({ id: item.id, values }, { onSuccess: () => navigate('/products') })
          }
        />
      </div>

      <ProductDeleteDialog
        item={showDeleteDialog ? item : null}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => navigate('/products')}
      />

      <ProductDuplicateDialog
        item={showDuplicateDialog ? item : null}
        onClose={() => setShowDuplicateDialog(false)}
        onDuplicated={(newId) => navigate(`/products/${newId}/edit`)}
      />
    </div>
  );
}
