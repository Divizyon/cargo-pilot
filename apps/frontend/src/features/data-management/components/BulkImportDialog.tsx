import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useBulkCreateItems } from '@/lib/api/useItems';
import {
  ITEM_CATEGORY,
  toAllowedRotations,
  toMaxWeightOnTop,
  type CreateItemRequest,
} from '@/lib/api/itemMappers';
import { downloadItemImportTemplate } from '@/lib/utils/export-utils';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  SKU?: string;
  Barkod?: string;
  'Ürün Adı'?: string;
  'Tip (koli/varil/palet)'?: string;
  'Genişlik(cm)'?: unknown;
  'Yükseklik(cm)'?: unknown;
  'Uzunluk(cm)'?: unknown;
  'Ağırlık(kg)'?: unknown;
  'Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)'?: unknown;
  'İstiflenebilir (true/false)'?: unknown;
  'Maks Kat'?: unknown;
  'X Dönüşümü (true/false)'?: unknown;
  'Y Dönüşümü (true/false)'?: unknown;
  'Z Dönüşümü (true/false)'?: unknown;
  'Özel Notlar'?: string;
}

function parseBoolCell(v: unknown, fallback = true): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const lower = v.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'evet';
  }
  return fallback;
}

function parseTipToCategory(
  tip: string | undefined,
): (typeof ITEM_CATEGORY)[keyof typeof ITEM_CATEGORY] {
  const t = (tip ?? '').toLowerCase().trim();
  if (t === 'palet' || t === 'pallet') return ITEM_CATEGORY.Pallet;
  if (t === 'koli' || t === 'box') return ITEM_CATEGORY.Box;
  return ITEM_CATEGORY.Package;
}

function parseRows(rows: ParsedRow[]): { items: CreateItemRequest[]; errors: string[] } {
  const items: CreateItemRequest[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    const lineNum = i + 2;
    const sku = row['SKU']?.toString().trim();
    const name = row['Ürün Adı']?.toString().trim();
    const width = Number(row['Genişlik(cm)']);
    const height = Number(row['Yükseklik(cm)']);
    const length = Number(row['Uzunluk(cm)']);
    const weight = Number(row['Ağırlık(kg)']);

    if (!sku) {
      errors.push(`Satır ${lineNum}: SKU zorunludur.`);
      return;
    }
    if (!name) {
      errors.push(`Satır ${lineNum}: Ürün Adı zorunludur.`);
      return;
    }
    if (!width || width <= 0) {
      errors.push(`Satır ${lineNum}: Geçerli bir Genişlik gereklidir.`);
      return;
    }
    if (!height || height <= 0) {
      errors.push(`Satır ${lineNum}: Geçerli bir Yükseklik gereklidir.`);
      return;
    }
    if (!length || length <= 0) {
      errors.push(`Satır ${lineNum}: Geçerli bir Uzunluk gereklidir.`);
      return;
    }
    if (!weight || weight <= 0) {
      errors.push(`Satır ${lineNum}: Geçerli bir Ağırlık gereklidir.`);
      return;
    }

    const fragilityRaw = Number(row['Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)'] ?? 0);
    const fragilityType = Math.min(Math.max(Math.round(fragilityRaw), 0), 4) as 0 | 1 | 2 | 3 | 4;
    const isStackable = parseBoolCell(row['İstiflenebilir (true/false)'], false);
    const maxStackCount = isStackable ? Math.max(Number(row['Maks Kat'] ?? 1), 1) : 0;
    const allowRotateX = parseBoolCell(row['X Dönüşümü (true/false)']);
    const allowRotateY = parseBoolCell(row['Y Dönüşümü (true/false)']);
    const allowRotateZ = parseBoolCell(row['Z Dönüşümü (true/false)']);
    const tip = row['Tip (koli/varil/palet)']?.toString().trim();

    items.push({
      sku,
      barcode: row['Barkod']?.toString().trim() || null,
      name,
      productType: tip ?? 'koli',
      category: parseTipToCategory(tip),
      width,
      height,
      length,
      weight,
      fragilityType,
      isStackable,
      maxStackCount,
      maxWeightOnTop: toMaxWeightOnTop(
        weight,
        isStackable,
        Math.max(Number(row['Maks Kat'] ?? 1), 1),
      ),
      allowedRotations: toAllowedRotations(allowRotateX, allowRotateY, allowRotateZ),
      specialNotes: row['Özel Notlar']?.toString().trim() || null,
    });
  });

  return { items, errors };
}

export function BulkImportDialog({ open, onOpenChange }: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedItems, setParsedItems] = useState<CreateItemRequest[]>([]);
  const bulkCreate = useBulkCreateItems();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseErrors([]);
    setParsedItems([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ParsedRow>(ws, { defval: '' });
      const { items, errors } = parseRows(rows);
      setParseErrors(errors);
      setParsedItems(items);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    if (parsedItems.length === 0) return;
    bulkCreate.mutate(
      { items: parsedItems },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFileName(null);
          setParsedItems([]);
          setParseErrors([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
      },
    );
  }

  function handleClose() {
    onOpenChange(false);
    setFileName(null);
    setParsedItems([]);
    setParseErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const hasErrors = parseErrors.length > 0;
  const canImport = parsedItems.length > 0 && !hasErrors && !bulkCreate.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Toplu Ürün İçe Aktar</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Excel şablonunu indirin, doldurun ve yükleyin. Herhangi bir satırda hata varsa hiçbir
            ürün eklenmez.
          </p>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={downloadItemImportTemplate}
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            Şablonu İndir
          </Button>

          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 transition-colors hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName ? fileName : 'Excel veya CSV dosyası seçin'}
            </p>
            {parsedItems.length > 0 && !hasErrors && (
              <p className="text-xs font-medium text-green-600">{parsedItems.length} ürün hazır</p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {hasErrors && (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-destructive">
                  {parseErrors.length} hata bulundu
                </p>
                <button
                  type="button"
                  onClick={() => setParseErrors([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-xs text-destructive">
                  {err}
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose} type="button">
              İptal
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!canImport} type="button">
              {bulkCreate.isPending
                ? 'Yükleniyor...'
                : parsedItems.length > 0
                  ? `${parsedItems.length} Ürün Ekle`
                  : 'İçe Aktar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
