/**
 * Ürün Excel şablonunun tek kaynağı.
 *
 * Şablon üretimi (export-utils), ürün dışa aktarımı ve içe aktarım ayrıştırıcısı
 * (BulkImportDialog) aynı başlıkları ve aynı sözlüğü kullanır; böylece
 * 'dışa aktar → düzenle → geri içe aktar' akışı veri kaybetmez.
 */

export const LOAD_GROUPS = [
  'Kimya',
  'Tehlikeli Madde',
  'Gıda',
  'Elektronik',
  'Tekstil',
  'Genel',
] as const;

export type LoadGroup = (typeof LOAD_GROUPS)[number];

/** Backend `FragilityType`/kısıt kodları; 0 = kısıtsız olduğu için listede yer almaz. */
export const FRAGILITY_OPTIONS = [
  { value: 1, label: 'Kırılgan' },
  { value: 2, label: 'Sıvı' },
  { value: 3, label: 'Yanıcı' },
  { value: 4, label: 'Oksitleyici' },
  { value: 5, label: 'Aşındırıcı' },
  { value: 6, label: 'Kokuya Hassas' },
  { value: 7, label: 'Gıda Teması' },
  { value: 8, label: 'Kuru Tut' },
  { value: 9, label: 'Kimyasal' },
] as const;

const FRAGILITY_HEADER_LEGEND = FRAGILITY_OPTIONS.map((o) => `${o.value}=${o.label}`).join('/');

export const ITEM_SHEET_HEADER = {
  sku: 'SKU',
  name: 'Ürün Adı',
  productType: 'Tip (koli/varil/palet)',
  width: 'Genişlik(cm)',
  height: 'Yükseklik(cm)',
  length: 'Uzunluk(cm)',
  weight: 'Ağırlık(kg)',
  constraints: `Kırılganlık (${FRAGILITY_HEADER_LEGEND})`,
  loadGroups: `Yük Grubu (${LOAD_GROUPS.join('/')})`,
  isStackable: 'İstiflenebilir (true/false)',
  maxStackCount: 'Maks Kat',
  rotateX: 'X Dönüşümü (true/false)',
  rotateY: 'Y Dönüşümü (true/false)',
  rotateZ: 'Z Dönüşümü (true/false)',
  notes: 'Özel Notlar',
} as const;

/** Eski şablonla doldurulmuş dosyalar da okunabilsin diye önceki başlıklar korunur. */
export const LEGACY_ITEM_SHEET_HEADER = {
  constraints: 'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)',
  loadGroups: 'Yük Grubu',
} as const;

const CELL_SEPARATOR = ', ';

function splitCell(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Hücrede hem kod ('1, 2') hem etiket ('Kırılgan, Sıvı') kabul edilir. */
export function parseConstraintCell(raw: unknown): number[] {
  const ids = splitCell(raw).map((part) => {
    const numeric = Number(part);
    if (Number.isInteger(numeric)) return numeric;
    const byLabel = FRAGILITY_OPTIONS.find(
      (o) => o.label.toLocaleLowerCase('tr') === part.toLocaleLowerCase('tr'),
    );
    return byLabel?.value ?? 0;
  });
  const known = new Set<number>(FRAGILITY_OPTIONS.map((o) => o.value));
  return Array.from(new Set(ids.filter((id) => known.has(id))));
}

export function formatConstraintCell(ids: readonly number[]): string {
  return ids.join(CELL_SEPARATOR);
}

/** Yük grubu sözlükte olmayan bir değerse satır kuralı gereği yok sayılır. */
export function parseLoadGroupCell(raw: unknown): string[] {
  const known = new Set<string>(LOAD_GROUPS);
  return Array.from(new Set(splitCell(raw).filter((part) => known.has(part))));
}

export function formatLoadGroupCell(groups: readonly string[]): string {
  return groups.join(CELL_SEPARATOR);
}

/** Ürünün kırılganlık derecesi seçili kısıtların en yükseğidir. */
export function toFragilityValue(constraintIds: readonly number[]): number {
  return constraintIds.length > 0 ? Math.max(...constraintIds) : 0;
}
