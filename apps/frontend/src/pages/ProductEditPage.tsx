import { useNavigate, useParams } from 'react-router-dom';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { useItem, useUpdateItem } from '@/lib/api/useItems';
import { itemToFormValues } from '@/lib/api/itemMappers';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: item, isLoading, isError } = useItem(id ?? '');
  const updateItem = useUpdateItem();

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
      <div className="shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ürün Detayı</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {item.name} — fiziksel özelliklerini ve kısıtlarını görüntüleyin veya güncelleyin.
        </p>
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
    </div>
  );
}
