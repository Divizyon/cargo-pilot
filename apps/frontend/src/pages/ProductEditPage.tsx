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
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !item) {
    return (
      <div className="flex w-full flex-col gap-6">
        <p className="text-sm text-destructive">Ürün yüklenemedi.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Ürünü Düzenle</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.name} — fiziksel özelliklerini ve kısıtlarını güncelleyin.
        </p>
      </div>

      <ProductForm
        defaultValues={itemToFormValues(item)}
        isSubmitting={updateItem.isPending}
        onCancel={() => navigate('/products')}
        onSubmit={(values) =>
          updateItem.mutate({ id: item.id, values }, { onSuccess: () => navigate('/products') })
        }
      />
    </div>
  );
}
