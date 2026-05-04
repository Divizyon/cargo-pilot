import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { useItem, useUpdateItem } from '@/lib/api/useItems';
import { itemToFormValues } from '@/lib/api/itemMappers';
import { Skeleton } from '@/components/ui/skeleton';

const FORM_ID = 'product-edit-form';

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ürün Detayı</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.name} — fiziksel özelliklerini ve kısıtlarını görüntüleyin veya güncelleyin.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={updateItem.isPending}
          >
            İptal Et
          </Button>
          <Button type="submit" form={FORM_ID} disabled={updateItem.isPending}>
            {updateItem.isPending ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </div>

      <ProductForm
        formId={FORM_ID}
        hideFooterActions
        defaultValues={itemToFormValues(item)}
        isSubmitting={updateItem.isPending}
        disableSubmitWhenPristine
        onCancel={() => navigate('/products')}
        onSubmit={(values) =>
          updateItem.mutate({ id: item.id, values }, { onSuccess: () => navigate('/products') })
        }
      />
    </div>
  );
}
