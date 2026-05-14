import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProductTable } from '@/features/data-management/components/ProductTable';
import { useUsageQuota, isQuotaExceeded } from '@/lib/api/useUsageQuota';
import type { Item } from '@/lib/types/item';

export function ProductsPage() {
  const navigate = useNavigate();
  const { data: quota } = useUsageQuota();

  function handleRowClick(item: Item) {
    navigate(`/products/${item.id}/edit`);
  }

  function handleCreateClick() {
    if (quota && isQuotaExceeded(quota.products)) {
      toast.error('Plan limitinize ulaştınız. Planınızı yükseltin.', { position: 'bottom-right' });
      return;
    }
    navigate('/products/new');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ürün Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Yükleme planında kullanılacak tüm birimlerin teknik verilerinin yönetildiği merkezdir.
        </p>
      </div>

      <ProductTable onRowClick={handleRowClick} onCreateClick={handleCreateClick} />
    </div>
  );
}
