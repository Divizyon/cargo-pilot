import { z } from 'zod';
import * as XLSX from 'xlsx';
import { INCOMPATIBLE_BY_GROUP } from '@/lib/api/itemMappers';
import {
  ITEM_SHEET_HEADER,
  LEGACY_ITEM_SHEET_HEADER,
  parseConstraintCell,
  parseLoadGroupCell,
  toFragilityValue,
} from '@/lib/config/item-import-columns';

/** Toplu aktarım tablosunun satır modeli ve Excel ayrıştırması; bileşenden bağımsız tutulur. */
export const editableRowSchema = z.object({
  _id: z.string(),
  sku: z.string(),
  name: z.string(),
  tip: z.string(),
  width: z.string(),
  height: z.string(),
  length: z.string(),
  weight: z.string(),
  fragility: z.string(),
  constraintIds: z.array(z.number().int()),
  /** Ürün formundaki tek seçimli yük grubu; uyumsuz gruplar bundan türetilir. */
  stackGroup: z.string(),
  incompatibleGroups: z.array(z.string()),
  isStackable: z.boolean(),
  maxStackCount: z.string(),
  allowRotateX: z.boolean(),
  allowRotateY: z.boolean(),
  allowRotateZ: z.boolean(),
  notes: z.string(),
  /** ERP kaynağında boş/sıfır gelen alan adları; hücre hatası bu satırlarda 'ERP'de eksik' der. */
  missingFields: z.array(z.string()).default([]),
});

export type EditableRow = z.infer<typeof editableRowSchema>;

export type RowErrors = Partial<
  Record<'sku' | 'name' | 'tip' | 'width' | 'height' | 'length' | 'weight' | 'stackGroup', string>
>;

/** Yük grubu seçimi uyumsuz grupları belirler; ürün formuyla aynı harita kullanılır. */
export function deriveIncompatibleGroups(stackGroup: string): string[] {
  return INCOMPATIBLE_BY_GROUP[stackGroup] ?? [];
}

/** ERP'den eksik gelen alan, kullanıcı hatası değildir; mesaj bunu ayırt eder. */
function numericFieldError(row: EditableRow, field: string, value: string): string | undefined {
  if (value && Number(value) > 0) return undefined;
  return row.missingFields.includes(field) ? 'ERP’de eksik' : 'Pozitif sayı';
}

export function validateRow(row: EditableRow): RowErrors {
  const e: RowErrors = {};
  if (!row.sku.trim()) e.sku = 'Zorunlu alan';
  if (!row.name.trim()) e.name = 'Zorunlu alan';
  if (!['koli', 'varil', 'palet'].includes(row.tip)) e.tip = 'koli / varil / palet';
  e.width = numericFieldError(row, 'width', row.width);
  e.height = numericFieldError(row, 'height', row.height);
  e.length = numericFieldError(row, 'length', row.length);
  e.weight = numericFieldError(row, 'weight', row.weight);
  if (!row.stackGroup) e.stackGroup = 'Zorunlu alan';
  for (const key of Object.keys(e) as Array<keyof RowErrors>) {
    if (e[key] === undefined) delete e[key];
  }
  return e;
}

export function emptyRow(): EditableRow {
  return editableRowSchema.parse({
    _id: crypto.randomUUID(),
    sku: '',
    name: '',
    tip: '',
    width: '',
    height: '',
    length: '',
    weight: '',
    fragility: '0',
    constraintIds: [],
    stackGroup: '',
    incompatibleGroups: [],
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
  });
}

function parseBool(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.toLowerCase().trim();
    return s === 'true' || s === '1' || s === 'evet';
  }
  return fallback;
}

/** Yeni başlık yoksa eski şablonla doldurulmuş dosya da okunur. */
function cell(
  row: Record<string, unknown>,
  header: string,
  legacyHeaders: readonly string[],
): unknown {
  const value = row[header];
  if (value !== undefined && value !== '') return value;
  for (const legacyHeader of legacyHeaders) {
    const legacyValue = row[legacyHeader];
    if (legacyValue !== undefined && legacyValue !== '') return legacyValue;
  }
  return undefined;
}

export function xlsxToRows(ws: XLSX.WorkSheet): EditableRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw.map((r) => {
    const constraintIds = parseConstraintCell(
      cell(r, ITEM_SHEET_HEADER.constraints, LEGACY_ITEM_SHEET_HEADER.constraints),
    );
    // Hücre eski şablonlarda çok değerli olabilir; ürün modeli tek grup tanır.
    const groups = parseLoadGroupCell(
      cell(r, ITEM_SHEET_HEADER.loadGroups, LEGACY_ITEM_SHEET_HEADER.loadGroups),
    );
    const stackGroup = groups[0] ?? '';
    return editableRowSchema.parse({
      _id: crypto.randomUUID(),
      sku: String(r[ITEM_SHEET_HEADER.sku] ?? ''),
      name: String(r[ITEM_SHEET_HEADER.name] ?? ''),
      tip:
        String(r[ITEM_SHEET_HEADER.productType] ?? '')
          .toLowerCase()
          .trim() || 'koli',
      width: String(r[ITEM_SHEET_HEADER.width] ?? ''),
      height: String(r[ITEM_SHEET_HEADER.height] ?? ''),
      length: String(cell(r, ITEM_SHEET_HEADER.length, LEGACY_ITEM_SHEET_HEADER.length) ?? ''),
      weight: String(r[ITEM_SHEET_HEADER.weight] ?? ''),
      fragility: String(toFragilityValue(constraintIds)),
      constraintIds,
      stackGroup,
      incompatibleGroups: deriveIncompatibleGroups(stackGroup),
      isStackable: parseBool(r[ITEM_SHEET_HEADER.isStackable], false),
      maxStackCount: String(
        cell(r, ITEM_SHEET_HEADER.maxStackCount, LEGACY_ITEM_SHEET_HEADER.maxStackCount) ?? '1',
      ),
      allowRotateX: parseBool(r[ITEM_SHEET_HEADER.rotateX], true),
      allowRotateY: parseBool(r[ITEM_SHEET_HEADER.rotateY], true),
      allowRotateZ: parseBool(r[ITEM_SHEET_HEADER.rotateZ], true),
      notes: String(r[ITEM_SHEET_HEADER.notes] ?? ''),
    });
  });
}
