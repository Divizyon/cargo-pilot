import { PRODUCT_TYPE_DISPLAY } from '@/lib/config/productTypeDisplay';
import type { ProductType } from '@/features/data-management/products/schemas/productSchema';

interface ProductTypeCellProps {
  productType: ProductType;
}

/** Tablo hücresinde ikon + etiket; ürün yönetimi ve ERP tablosunda aynı çizilir. */
export function ProductTypeCell({ productType }: ProductTypeCellProps) {
  const { Icon, label } = PRODUCT_TYPE_DISPLAY[productType];
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
      <span className="whitespace-nowrap text-xs">{label}</span>
    </div>
  );
}
