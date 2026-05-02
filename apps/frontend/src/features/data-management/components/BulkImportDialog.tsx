import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2, Download, FileUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
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

interface ParsedError {
  row: string;
  message: string;
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

function parseErrorEntry(err: string): ParsedError {
  const match = err.match(/^Satır (\d+): (.+)$/);
  return match ? { row: match[1], message: match[2] } : { row: '—', message: err };
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedItems, setParsedItems] = useState<CreateItemRequest[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const bulkCreate = useBulkCreateItems();

  function processFile(file: File) {
    setFileName(file.name);
    setParseErrors([]);
    setParsedItems([]);
    setImportResult(null);
    setShowResult(false);

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
    reader.onerror = () => {
      toast.error('Dosya okunamadı veya sunucuya erişilemiyor', { position: 'bottom-right' });
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleImport() {
    if (parsedItems.length === 0) return;
    bulkCreate.mutate(
      { items: parsedItems },
      {
        onSuccess: (data) => {
          const count = data?.data?.count ?? parsedItems.length;
          setImportResult({ count });
          requestAnimationFrame(() => setShowResult(true));
          setTimeout(() => {
            onOpenChange(false);
            resetState();
          }, 2000);
        },
      },
    );
  }

  function resetState() {
    setFileName(null);
    setParsedItems([]);
    setParseErrors([]);
    setImportResult(null);
    setShowResult(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    onOpenChange(false);
    resetState();
  }

  const hasErrors = parseErrors.length > 0;
  const canImport = parsedItems.length > 0 && !hasErrors && !bulkCreate.isPending && !importResult;

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

          {/* Drop Zone */}
          <div
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors',
              isDragOver
                ? 'border-primary bg-primary/10'
                : 'border-border bg-muted/30 hover:bg-muted/50',
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileUp
              className={cn('h-8 w-8', isDragOver ? 'text-primary' : 'text-muted-foreground')}
            />
            <p className={cn('text-sm', isDragOver ? 'text-primary' : 'text-muted-foreground')}>
              {isDragOver
                ? 'Dosyayı bırakın'
                : fileName
                  ? fileName
                  : 'Excel veya CSV dosyası seçin ya da sürükleyin'}
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

          {/* Progress bar */}
          {bulkCreate.isPending && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Yükleniyor...</p>
              <Progress value={undefined} className="h-1.5 animate-pulse" />
            </div>
          )}

          {/* Fade-in sonuç paneli */}
          {importResult && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700 transition-opacity duration-300',
                showResult ? 'opacity-100' : 'opacity-0',
              )}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{importResult.count} ürün başarıyla eklendi</span>
            </div>
          )}

          {/* Hata tablosu */}
          {hasErrors && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5">
              <div className="flex items-center justify-between border-b border-destructive/20 px-3 py-2">
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
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-destructive/5">
                    <tr className="border-b border-destructive/20 text-left text-destructive/70">
                      <th className="w-20 px-3 py-1.5 font-medium">Satır</th>
                      <th className="px-3 py-1.5 font-medium">Hata Açıklaması</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseErrors.map((err, i) => {
                      const { row, message } = parseErrorEntry(err);
                      return (
                        <tr
                          key={i}
                          className="border-b border-destructive/10 last:border-0 hover:bg-destructive/10"
                        >
                          <td className="px-3 py-1.5 font-mono text-destructive">{row}</td>
                          <td className="px-3 py-1.5 text-destructive">{message}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose} type="button">
              İptal
            </Button>
            <Button size="sm" onClick={handleImport} disabled={!canImport} type="button">
              {parsedItems.length > 0 ? `${parsedItems.length} Ürün Ekle` : 'Ürün Ekle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
