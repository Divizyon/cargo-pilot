import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/data-management/components/ProductForm';
import { useCreateItem } from '@/lib/api/useItems';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const createItem = useCreateItem();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2 gap-1 text-muted-foreground"
            onClick={() => navigate('/products')}
          >
            <ArrowLeft className="h-4 w-4" />
            Ürünlere Dön
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Yeni Ürün Ekle</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ürünün kimliğini, fiziksel özelliklerini ve kısıtlarını tanımlayın.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
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
    </div>
  );
}
