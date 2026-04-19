import * as XLSX from 'xlsx';
import {
  productSchema,
  type ProductFormValues,
} from '@/features/data-management/schemas/productSchema';

export interface ImportRowError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportResult {
  valid: ProductFormValues[];
  errors: ImportRowError[];
}

const CHUNK_SIZE = 100;

export const IMPORT_COLUMNS = [
  'name',
  'sku',
  'width',
  'height',
  'length',
  'weight',
  'fragility',
  'isStackable',
  'maxStackCount',
  'allowRotateX',
  'allowRotateY',
  'allowRotateZ',
] as const;

export function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!(buffer instanceof ArrayBuffer)) {
          reject(new Error('Dosya okunamadı'));
          return;
        }
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          reject(new Error('Çalışma kitabında sayfa bulunamadı'));
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: null,
        });
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okuma hatası'));
    reader.readAsArrayBuffer(file);
  });
}

function normalizeBoolean(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'evet', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'hayir', 'hayır', 'no'].includes(normalized)) return false;
  }
  return value;
}

function coerceRow(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    isStackable: normalizeBoolean(raw.isStackable),
    allowRotateX: normalizeBoolean(raw.allowRotateX),
    allowRotateY: normalizeBoolean(raw.allowRotateY),
    allowRotateZ: normalizeBoolean(raw.allowRotateZ),
    maxStackCount:
      raw.maxStackCount === null || raw.maxStackCount === '' ? undefined : raw.maxStackCount,
  };
}

export async function validateRows(
  rows: Record<string, unknown>[],
  onProgress?: (processed: number, total: number) => void,
): Promise<ImportResult> {
  const valid: ProductFormValues[] = [];
  const errors: ImportRowError[] = [];
  const total = rows.length;

  for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, total);
    for (let i = offset; i < end; i++) {
      const rowNumber = i + 1;
      const result = productSchema.safeParse(coerceRow(rows[i]));
      if (result.success) {
        valid.push(result.data);
      } else {
        for (const issue of result.error.issues) {
          errors.push({
            row: rowNumber,
            field: issue.path.join('.') || undefined,
            message: issue.message,
          });
        }
      }
    }
    onProgress?.(end, total);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return { valid, errors };
}

export function downloadImportTemplate(filename = 'cargo-pilot-urun-sablonu.xlsx'): void {
  const example: Record<string, unknown> = {
    name: 'Ornek Kutu',
    sku: 'BOX-001',
    width: 30,
    height: 20,
    length: 40,
    weight: 5,
    fragility: 0,
    isStackable: true,
    maxStackCount: 3,
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
  };
  const sheet = XLSX.utils.json_to_sheet([example], { header: [...IMPORT_COLUMNS] });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products');
  XLSX.writeFile(workbook, filename);
}
