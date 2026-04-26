import { useNavigate } from 'react-router-dom';
import { ProductTable } from '@/features/data-management/components/ProductTable';

export function ProductsPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ürün Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yükleme planında kullanılacak tüm birimlerin teknik verilerinin yönetildiği merkezdir.
        </p>
      </div>

      <ProductTable onCreateClick={() => navigate('/products/new')} />
    </div>
  );
}
