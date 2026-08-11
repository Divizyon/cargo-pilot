import { fromAllowedRotations, fromCategory } from '@/lib/api/itemMappers';
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

  return {
    _id: crypto.randomUUID(),
    sku: item.sku ?? '',
    name: item.name,
    tip: fromCategory(item.category),
    width: String(item.width),
    height: String(item.height),
    length: String(item.length),
    weight: String(item.weight),
    fragility: String(item.fragilityType),
    isStackable: item.isStackable,
    maxStackCount: String(item.maxStackCount > 0 ? item.maxStackCount : 1),
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    constraintIds: item.constraintIds ?? [],
    incompatibleGroups: item.incompatibleGroups ?? [],
    notes: item.specialNotes ?? '',
    missingFields: item.missingFields ?? [],
  };
}
