import type { Item } from '@/lib/types/item';

/**
 * Katalog kapsama tablosu.
 *
 * Ürün kısıtları bu arayüzden düzenlenemez — `CreatePlanCommand` yalnızca
 * itemId/quantity/groupId taşır, kısıtlar `Item` kaydından gelir. Motorun bir
 * dalını test edebilmek bu yüzden katalogda o kısıtı taşıyan bir ürün
 * bulunmasına bağlı. Tablo bu bağımlılığı kaldırmıyor, görünür kılıyor.
 *
 * Hesap panelden buraya alındı çünkü iki tüketicisi var: ekrandaki kapsama
 * sekmesi ve toplu koşu kaydı. Rapor "hangi dallar test EDİLEBİLİRDİ" bilgisini
 * taşımazsa, aylar sonra okunan bir sonuç yorumlanamaz.
 */
export interface CoverageRow {
  /** Kayıtta saklanan sabit anahtar; etiket değişse de seri kırılmaz. */
  key: string;
  label: string;
  /** Motordaki karşılığı. */
  sourceRef: string;
  count: number;
}

/** Motorun yalnızca 1 (Fragile) için dallandığı değer; 2-9 ayrıştırma sınıfıdır. */
const FRAGILITY_FRAGILE = 1;

const ROTATION_LABEL: Record<number, string> = {
  1: 'NoVertical',
  2: 'Fixed',
  3: 'NoYaw',
  4: 'PitchOnly',
  5: 'RollOnly',
};

/**
 * Dal tanımları tek yerde: hem canlı katalogdan sayım hem de kayıttaki sayıların
 * etiketlenmesi buradan türer. Kayıt yalnızca anahtar ve adet taşıdığı için,
 * aylar sonra okunan bir koşunun kapsamı ancak bu tabloyla adlandırılabilir.
 */
interface CoverageDefinition {
  key: string;
  label: string;
  sourceRef: string;
  matches: (item: Item) => boolean;
}

const COVERAGE_DEFINITIONS: CoverageDefinition[] = [
  {
    key: 'nonStackable',
    label: 'İstiflenemez ürün',
    sourceRef: 'PlacementValidator.cs:92-116',
    matches: (i) => !i.isStackable,
  },
  {
    key: 'maxStackCount',
    label: 'İstif adedi sınırlı',
    sourceRef: 'PlacementValidator.cs:120-142',
    matches: (i) => i.maxStackCount > 0,
  },
  {
    key: 'maxWeightOnTop',
    label: 'Üst ağırlık sınırlı',
    sourceRef: 'PlacementValidator.cs:147-172',
    matches: (i) => (i.maxWeightOnTop ?? 0) > 0,
  },
  {
    key: 'fragile',
    label: 'Kırılgan (FragilityType=1)',
    sourceRef: 'PlacementValidator.cs:188-207',
    matches: (i) => i.fragility === FRAGILITY_FRAGILE,
  },
  ...Object.entries(ROTATION_LABEL).map(([value, label]) => ({
    key: `rotation:${label}`,
    label: `Rotasyon: ${label}`,
    sourceRef: 'PlacementValidator.cs:215-260',
    matches: (i: Item) => i.allowedRotations === Number(value),
  })),
  {
    key: 'stackGroup',
    label: 'Ayrışım grubu tanımlı',
    sourceRef: 'ContaminationFilter.cs:22-103',
    matches: (i) => Boolean(i.stackGroup),
  },
  {
    key: 'incompatibleGroups',
    label: 'Uyumsuz grup tanımlı',
    sourceRef: 'ContaminationFilter.cs:22-103',
    matches: (i) => (i.incompatibleGroups?.length ?? 0) > 0,
  },
];

export function buildCatalogCoverage(items: readonly Item[]): CoverageRow[] {
  return COVERAGE_DEFINITIONS.map(({ key, label, sourceRef, matches }) => ({
    key,
    label,
    sourceRef,
    count: items.filter(matches).length,
  }));
}

/**
 * Kayıttaki sayıları etiketler. Tanımı kaybolmuş bir anahtar atlanır: eski bir
 * koşuda artık var olmayan bir dalın adını uydurmaktansa göstermemek doğru.
 */
export function fromCoverageCounts(
  counts: readonly { key: string; count: number }[],
): CoverageRow[] {
  const countByKey = new Map(counts.map((entry) => [entry.key, entry.count]));

  return COVERAGE_DEFINITIONS.filter((definition) => countByKey.has(definition.key)).map(
    ({ key, label, sourceRef }) => ({ key, label, sourceRef, count: countByKey.get(key) ?? 0 }),
  );
}

/**
 * Ürün motorun kısıt dallarından en az birini tetikliyor mu.
 *
 * Senaryo üretiminin buna ihtiyacı var: kör rastgele seçim, katalogda kısıtlı
 * ürün az olduğunda senaryoların neredeyse tamamını kısıtsız ürünlerle
 * dolduruyor ve motorun asıl kırılgan dalları hiç koşulmuyordu.
 */
export function isConstrainedItem(item: Item): boolean {
  return (
    !item.isStackable ||
    item.maxStackCount > 0 ||
    (item.maxWeightOnTop ?? 0) > 0 ||
    item.fragility === FRAGILITY_FRAGILE ||
    item.allowedRotations !== 0 ||
    Boolean(item.stackGroup) ||
    (item.incompatibleGroups?.length ?? 0) > 0
  );
}

/** Kayıtta saklanan sade biçim; etiket ve kaynak referansı okunurken üretilir. */
export function toCoverageCounts(rows: readonly CoverageRow[]): Array<{
  key: string;
  count: number;
}> {
  return rows.map((row) => ({ key: row.key, count: row.count }));
}
