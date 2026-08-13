import { fromAllowedRotations, fromCategory, PALLET_HEIGHT_CM } from '@/lib/api/itemMappers';
import { deriveIncompatibleGroups } from '@/features/data-management/imports/utils/itemImportRow';
import type { DraftItem } from '@/lib/api/useDraftItems';
import type { EditableRow } from '@/features/data-management/imports/components/BulkImportDialog';

/**
 * ERP taslağını aktarım tablosunun satır modeline çevirir.
 *
 * Kategori ve rotasyon eşlemesi yalnızca `itemMappers` üzerinden yapılır; burada
 * tekrarlanırsa taslak onayında ürün tipi sessizce değişir (koli ↔ varil).
 */
export function draftItemToRow(item: DraftItem): EditableRow {
  const { allowRotateX, allowRotateY, allowRotateZ } = fromAllowedRotations(item.allowedRotations);
  // ERP tip bilgisi taşımaz; backend taslağı sabit "koli" ile açar, kullanıcı gridde değiştirir.
  const tip = fromCategory(item.category);
  const stackGroup = item.stackGroup ?? item.incompatibleGroups?.[0] ?? '';
  // Kayıtta palet tabanı yüksekliğe eklenir; gridde yalnızca ürün yüksekliği düzenlenir.
  const height =
    tip === 'palet' && item.height > PALLET_HEIGHT_CM
      ? item.height - PALLET_HEIGHT_CM
      : item.height;

  return {
    _id: crypto.randomUUID(),
    sku: item.sku ?? '',
    name: item.name,
    tip,
    width: String(item.width),
    height: String(height),
    length: String(item.length),
    weight: String(item.weight),
    fragility: String(item.fragilityType),
    isStackable: item.isStackable,
    maxStackCount: String(item.maxStackCount > 0 ? item.maxStackCount : 1),
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    constraintIds: item.constraintIds ?? [],
    stackGroup,
    incompatibleGroups: deriveIncompatibleGroups(stackGroup),
    notes: item.specialNotes ?? '',
    missingFields: item.missingFields ?? [],
    barcode: item.barcode ?? null,
  };
}
