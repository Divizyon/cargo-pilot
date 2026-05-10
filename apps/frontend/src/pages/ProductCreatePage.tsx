import { useNavigate } from 'react-router-dom';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { useCreateItem } from '@/lib/api/useItems';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const createItem = useCreateItem();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Yeni Ürün Ekle</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ürünün kimliğini, fiziksel özelliklerini ve kısıtlarını tanımlayın.
        </p>
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
