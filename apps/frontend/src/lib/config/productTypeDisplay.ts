import { Box, Cylinder, Package } from 'lucide-react';
import { fromCategory } from '@/lib/api/itemMappers';
import type { ProductType } from '@/features/data-management/products/schemas/productSchema';

/**
 * Ürün tipinin tek gösterim sözlüğü. Ürün yönetimi ve ERP aktarım tabloları aynı
 * ikon ve etiketi buradan alır; ekranlar arası ayrışma olmaz.
 */
export const PRODUCT_TYPE_DISPLAY = {
  koli: { Icon: Box, label: 'Koli' },
  varil: { Icon: Cylinder, label: 'Varil' },
  palet: { Icon: Package, label: 'Paletli Ürün' },
} as const;

/**
 * ERP taslağının gerçek tipi `category` alanındadır; `productType` sütunu ERP
 * çekiminde sabit "General" yazıldığı için gösterimde kullanılmaz.
 */
export function draftProductType(category: number): ProductType {
  return fromCategory(category);
}
