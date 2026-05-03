import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { useCreateItem } from '@/lib/api/useItems';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const createItem = useCreateItem();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Yeni Ürün Ekle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ürünün kimliğini, fiziksel özelliklerini ve kısıtlarını tanımlayın.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={createItem.isPending}
          >
            İptal Et
          </Button>
          <Button type="submit" form="product-form" disabled={createItem.isPending}>
            {createItem.isPending ? 'Kaydediliyor...' : 'Ürünü Kaydet'}
          </Button>
        </div>
      </div>

      <ProductForm
        isSubmitting={createItem.isPending}
        onCancel={() => navigate('/products')}
        onSubmit={(values) =>
          createItem.mutate(values, {
            onSuccess: () => navigate('/products'),
          })
        }
      />
    </div>
  );
}
