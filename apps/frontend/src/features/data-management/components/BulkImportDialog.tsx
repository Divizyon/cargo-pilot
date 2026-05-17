import { useRef, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { Download, ExternalLink, FileUp, Plus, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBulkCreateItems, type BackendError } from '@/lib/api/useItems';
import {
  ITEM_CATEGORY,
  toAllowedRotations,
  toMaxWeightOnTop,
  type CreateItemRequest,
} from '@/lib/api/itemMappers';
import {
  useUpdateDraftItem,
  useBulkApproveDraftItems,
  type UpdateDraftItemPayload,
} from '@/lib/api/useDraftItems';
import { downloadItemImportTemplate } from '@/lib/utils/export-utils';

// Google Sheets şablonu oluşturulduğunda bu URL'i buraya ekleyin
const ITEM_SHEETS_TEMPLATE_URL = '';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRows?: EditableRow[];
  /** Maps row._id → draft item backend id. When present, PUT+approve-bulk is used instead of bulk-create. */
  draftItemIds?: Record<string, string>;
}

// ─── Row model ────────────────────────────────────────────────────────────────

const editableRowSchema = z.object({
  _id: z.string(),
  sku: z.string(),
  barcode: z.string(),
  name: z.string(),
  tip: z.string(),
  width: z.string(),
  height: z.string(),
  length: z.string(),
  weight: z.string(),
  fragility: z.string(),
  isStackable: z.boolean(),
  maxStackCount: z.string(),
  allowRotateX: z.boolean(),
  allowRotateY: z.boolean(),
  allowRotateZ: z.boolean(),
  notes: z.string(),
});

export type EditableRow = z.infer<typeof editableRowSchema>;

type RowErrors = Partial<
  Record<'sku' | 'name' | 'tip' | 'width' | 'height' | 'length' | 'weight', string>
>;

// ─── Validation & mapping ─────────────────────────────────────────────────────

function validateRow(row: EditableRow): RowErrors {
  const e: RowErrors = {};
  if (!row.sku.trim()) e.sku = 'Zorunlu alan';
  if (!row.name.trim()) e.name = 'Zorunlu alan';
  if (!['koli', 'varil', 'palet'].includes(row.tip)) e.tip = 'koli / varil / palet';
  if (!row.width || Number(row.width) <= 0) e.width = 'Pozitif sayı';
  if (!row.height || Number(row.height) <= 0) e.height = 'Pozitif sayı';
  if (!row.length || Number(row.length) <= 0) e.length = 'Pozitif sayı';
  if (!row.weight || Number(row.weight) <= 0) e.weight = 'Pozitif sayı';
  return e;
}

function tipToCategory(tip: string): (typeof ITEM_CATEGORY)[keyof typeof ITEM_CATEGORY] {
  if (tip === 'palet') return ITEM_CATEGORY.Pallet;
  if (tip === 'koli') return ITEM_CATEGORY.Box;
  return ITEM_CATEGORY.Package;
}

function rowToRequest(row: EditableRow): CreateItemRequest {
  const weight = Number(row.weight);
  const isStackable = row.isStackable;
  const rawMax = Math.max(Number(row.maxStackCount) || 1, 1);
  const maxStackCount = isStackable ? rawMax : 0;
  const fragilityType = Math.min(Math.max(Math.round(Number(row.fragility) || 0), 0), 9);
  return {
    sku: row.sku.trim(),
    barcode: row.barcode.trim() || null,
    name: row.name.trim(),
    productType: row.tip,
    category: tipToCategory(row.tip),
    width: Number(row.width),
    height: Number(row.height),
    length: Number(row.length),
    weight,
    fragilityType,
    isStackable,
    maxStackCount,
    maxWeightOnTop: toMaxWeightOnTop(weight, isStackable, rawMax),
    allowedRotations: toAllowedRotations(row.allowRotateX, row.allowRotateY, row.allowRotateZ),
    specialNotes: row.notes.trim() || null,
  };
}

function rowToUpdatePayload(row: EditableRow): UpdateDraftItemPayload {
  const weight = Number(row.weight);
  const isStackable = row.isStackable;
  const rawMax = Math.max(Number(row.maxStackCount) || 1, 1);
  const maxStackCount = isStackable ? rawMax : 0;
  return {
    productType: row.tip,
    category: tipToCategory(row.tip),
    width: Number(row.width),
    height: Number(row.height),
    length: Number(row.length),
    weight,
    fragilityType: Math.min(Math.max(Math.round(Number(row.fragility) || 0), 0), 9),
    isStackable,
    maxStackCount,
    maxWeightOnTop: toMaxWeightOnTop(weight, isStackable, rawMax),
    allowedRotations: toAllowedRotations(row.allowRotateX, row.allowRotateY, row.allowRotateZ),
    barcode: row.barcode.trim() || null,
    specialNotes: row.notes.trim() || null,
  };
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

function xlsxToRows(ws: XLSX.WorkSheet): EditableRow[] {
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
  return raw.map((r) =>
    editableRowSchema.parse({
      _id: crypto.randomUUID(),
      sku: String(r['SKU'] ?? ''),
      barcode: String(r['Barkod'] ?? ''),
      name: String(r['Ürün Adı'] ?? ''),
      tip:
        String(r['Tip (koli/varil/palet)'] ?? '')
          .toLowerCase()
          .trim() || 'koli',
      width: String(r['Genişlik(cm)'] ?? ''),
      height: String(r['Yükseklik(cm)'] ?? ''),
      length: String(r['Uzunluk(cm)'] ?? ''),
      weight: String(r['Ağırlık(kg)'] ?? ''),
      fragility: String(r['Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)'] ?? '0'),
      isStackable: parseBool(r['İstiflenebilir (true/false)'], false),
      maxStackCount: String(r['Maks Kat'] ?? '1'),
      allowRotateX: parseBool(r['X Dönüşümü (true/false)'], true),
      allowRotateY: parseBool(r['Y Dönüşümü (true/false)'], true),
      allowRotateZ: parseBool(r['Z Dönüşümü (true/false)'], true),
      notes: String(r['Özel Notlar'] ?? ''),
    }),
  );
}

function emptyRow(): EditableRow {
  return editableRowSchema.parse({
    _id: crypto.randomUUID(),
    sku: '',
    barcode: '',
    name: '',
    tip: '',
    width: '',
    height: '',
    length: '',
    weight: '',
    fragility: '0',
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
  });
}

// ─── Cell components ──────────────────────────────────────────────────────────

interface TextCellProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
}

function TextCell({ value, onChange, error, type = 'text', className }: TextCellProps) {
  return (
    <Input
      type={type}
      value={value}
      title={error}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-7 min-w-0 rounded border px-1.5 text-xs',
        error
          ? 'border-destructive bg-destructive/5 text-destructive focus-visible:ring-destructive/30'
          : 'border-border bg-background focus-visible:ring-primary/20',
        className,
      )}
    />
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function BulkImportDialog({
  open,
  onOpenChange,
  initialRows,
  draftItemIds,
}: BulkImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>(() => initialRows ?? []);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const prevOpenRef = useRef(false);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open && initialRows && initialRows.length > 0) {
      setRows(initialRows);
      setApiErrors([]);
    }
  }
  const bulkCreate = useBulkCreateItems();
  const updateDraftItem = useUpdateDraftItem();
  const bulkApproveDraft = useBulkApproveDraftItems();

  function patchRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      setRows(xlsxToRows(wb.Sheets[wb.SheetNames[0]]));
      setApiErrors([]);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  }

  async function handleImport() {
    const hasClientErrors = rows.some((r) => Object.keys(validateRow(r)).length > 0);
    if (hasClientErrors || rows.length === 0) return;
    setApiErrors([]);

    if (draftItemIds) {
      try {
        await Promise.all(
          rows.map((row) => {
            const draftId = draftItemIds[row._id];
            if (!draftId) return Promise.resolve();
            return updateDraftItem.mutateAsync({ id: draftId, payload: rowToUpdatePayload(row) });
          }),
        );
        const ids = rows.map((row) => draftItemIds[row._id]).filter(Boolean);
        await bulkApproveDraft.mutateAsync(ids);
        handleClose();
      } catch {
        // errors surfaced via toasts in mutation hooks
      }
      return;
    }

    bulkCreate.mutate(
      { items: rows.map(rowToRequest) },
      {
        onSuccess: () => handleClose(),
        onError: (err) => {
          const failures = (err as AxiosError<BackendError>).response?.data?.error
            ?.validationFailures;
          if (failures?.length) {
            setApiErrors(
              failures.map((f) => [f.propertyName, f.errorMessage].filter(Boolean).join(': ')),
            );
          }
        },
      },
    );
  }

  function handleClose() {
    onOpenChange(false);
    setRows([]);
    setApiErrors([]);
  }

  const validations = rows.map((r) => ({ id: r._id, errors: validateRow(r) }));
  const errorRowCount = validations.filter((v) => Object.keys(v.errors).length > 0).length;
  const isDraftPending = updateDraftItem.isPending || bulkApproveDraft.isPending;
  const canImport =
    rows.length > 0 && errorRowCount === 0 && !bulkCreate.isPending && !isDraftPending;

  // ─── Empty state: file picker ─────────────────────────────────────────────

  if (rows.length === 0 && !draftItemIds) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Toplu Ürün İçe Aktar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Excel şablonunu indirin, doldurun ve yükleyin. Yüklenen veriler düzenlenebilir tabloda
              gösterilir, excele geri dönmenize gerek kalmaz.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={downloadItemImportTemplate}
                type="button"
              >
                <Download className="h-3.5 w-3.5" />
                Excel Şablonunu İndir
              </Button>
              {ITEM_SHEETS_TEMPLATE_URL && (
                <Button variant="outline" size="sm" className="gap-2 text-xs" type="button" asChild>
                  <a href={ITEM_SHEETS_TEMPLATE_URL} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Google Sheets Şablonu
                  </a>
                </Button>
              )}
            </div>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-10 transition-colors hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Excel veya CSV dosyası seçin</p>
              <p className="text-xs text-muted-foreground">ya da sürükleyip bırakın</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose} type="button">
                İptal
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => setRows([emptyRow()])}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Dosya Ekle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Table state: editable grid ───────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[78vh] w-[95vw] max-w-[1280px] flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="flex-none border-b px-6 py-4 pr-14">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {draftItemIds ? 'Taslak Ürünleri Onayla' : 'Toplu Ürün İçe Aktar'}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hücreleri tıklayarak doğrudan düzenleyin. Kırmızı alanları düzeltin, ardından{' '}
                {draftItemIds ? 'onaylayın.' : 'içe aktarın.'}
              </p>
            </div>
            <div className="mr-4">
              {errorRowCount > 0 ? (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  {errorRowCount} satırda hata var
                </span>
              ) : (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  {rows.length} satır hazır
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* API errors */}
        {apiErrors.length > 0 && (
          <div className="flex-none border-b border-destructive/20 bg-destructive/5 px-6 py-2">
            <p className="mb-1 text-xs font-semibold text-destructive">
              Sunucu {apiErrors.length} satırı reddetti:
            </p>
            <ul className="list-inside list-disc space-y-0.5">
              {apiErrors.map((e, i) => (
                <li key={i} className="text-xs text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scrollable table */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-7 border-b px-1 py-1.5 text-center">#</th>
                <th className="w-[11%] whitespace-nowrap border-b px-2 py-1.5">Ürün Adı *</th>
                <th className="w-[8%] whitespace-nowrap border-b px-2 py-1.5">SKU *</th>
                <th className="w-[9%] whitespace-nowrap border-b px-2 py-1.5">Barkod</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Tip *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Uzunluk/Çap (X) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Yükseklik (Y) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Derinlik (Z) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Ağırlık *</th>
                <th className="w-[9%] whitespace-nowrap border-b px-2 py-1.5">Kırılganlık</th>
                <th className="w-[5%] whitespace-nowrap border-b px-1 py-1.5 text-center">İstif</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Kat Sayısı</th>
                <th className="w-7 whitespace-nowrap border-b px-1 py-1.5 text-center">X</th>
                <th className="w-7 whitespace-nowrap border-b px-1 py-1.5 text-center">Y</th>
                <th className="w-7 whitespace-nowrap border-b px-1 py-1.5 text-center">Z</th>
                <th className="whitespace-nowrap border-b px-2 py-1.5">Notlar</th>
                <th className="w-8 border-b px-1 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const errs = validations.find((v) => v.id === row._id)?.errors ?? {};
                const hasRowError = Object.keys(errs).length > 0;
                return (
                  <tr
                    key={row._id}
                    className={cn(
                      'transition-colors',
                      hasRowError ? 'bg-destructive/[0.04]' : 'hover:bg-muted/30',
                    )}
                  >
                    {/* Row number */}
                    <td className="border-b border-border/40 px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                      {idx + 1}
                    </td>

                    {/* Ürün Adı */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.name}
                        onChange={(v) => patchRow(row._id, { name: v })}
                        error={errs.name}
                      />
                    </td>

                    {/* SKU */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.sku}
                        onChange={(v) => patchRow(row._id, { sku: v })}
                        error={errs.sku}
                      />
                    </td>

                    {/* Barkod */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.barcode}
                        onChange={(v) => patchRow(row._id, { barcode: v })}
                      />
                    </td>

                    {/* Tip */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <Select value={row.tip} onValueChange={(v) => patchRow(row._id, { tip: v })}>
                        <SelectTrigger
                          className={cn(
                            'h-7 border px-1 text-xs',
                            errs.tip
                              ? 'border-destructive bg-destructive/5 text-destructive'
                              : 'border-border bg-background',
                          )}
                        >
                          <SelectValue placeholder="Seçiniz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="koli">Koli</SelectItem>
                          <SelectItem value="varil">Varil</SelectItem>
                          <SelectItem value="palet">Palet</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Genişlik */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.width}
                        onChange={(v) => patchRow(row._id, { width: v })}
                        error={errs.width}
                        type="number"
                      />
                    </td>

                    {/* Yükseklik */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.height}
                        onChange={(v) => patchRow(row._id, { height: v })}
                        error={errs.height}
                        type="number"
                      />
                    </td>

                    {/* Uzunluk */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.length}
                        onChange={(v) => patchRow(row._id, { length: v })}
                        error={errs.length}
                        type="number"
                      />
                    </td>

                    {/* Ağırlık */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.weight}
                        onChange={(v) => patchRow(row._id, { weight: v })}
                        error={errs.weight}
                        type="number"
                      />
                    </td>

                    {/* Kısıtlar */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <Select
                        value={row.fragility}
                        onValueChange={(v) => patchRow(row._id, { fragility: v })}
                      >
                        <SelectTrigger className="h-7 border border-border bg-background px-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Normal</SelectItem>
                          <SelectItem value="1">Kırılgan</SelectItem>
                          <SelectItem value="2">Sıvı</SelectItem>
                          <SelectItem value="5">Aşındırıcı</SelectItem>
                          <SelectItem value="6">Kokuya Hassas</SelectItem>
                          <SelectItem value="7">Gıda Teması</SelectItem>
                          <SelectItem value="8">Kuru</SelectItem>
                          <SelectItem value="9">Kimyasal</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* İstiflenebilir */}
                    <td className="border-b border-border/40 px-1 py-0.5 text-center">
                      <Checkbox
                        checked={row.isStackable}
                        onCheckedChange={(checked) =>
                          patchRow(row._id, { isStackable: Boolean(checked) })
                        }
                        className="h-4 w-4"
                      />
                    </td>

                    {/* Kat Sayısı */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.maxStackCount}
                        onChange={(v) => patchRow(row._id, { maxStackCount: v })}
                        type="number"
                      />
                    </td>

                    {/* X/Y/Z rotasyon */}
                    <td className="border-b border-border/40 px-1 py-0.5 text-center">
                      <Checkbox
                        checked={row.allowRotateX}
                        onCheckedChange={(checked) =>
                          patchRow(row._id, { allowRotateX: Boolean(checked) })
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="border-b border-border/40 px-1 py-0.5 text-center">
                      <Checkbox
                        checked={row.allowRotateY}
                        onCheckedChange={(checked) =>
                          patchRow(row._id, { allowRotateY: Boolean(checked) })
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="border-b border-border/40 px-1 py-0.5 text-center">
                      <Checkbox
                        checked={row.allowRotateZ}
                        onCheckedChange={(checked) =>
                          patchRow(row._id, { allowRotateZ: Boolean(checked) })
                        }
                        className="h-4 w-4"
                      />
                    </td>

                    {/* Notlar */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.notes}
                        onChange={(v) => patchRow(row._id, { notes: v })}
                      />
                    </td>

                    {/* Sil */}
                    <td className="border-b border-border/40 px-1 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Satırı sil"
                        onClick={() => setRows((p) => p.filter((r) => r._id !== row._id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-none items-center justify-between border-t bg-background px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              type="button"
              onClick={() => setRows((p) => [...p, emptyRow()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Satır Ekle
            </Button>
            {!draftItemIds && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Dosya Değiştir
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  type="button"
                  onClick={downloadItemImportTemplate}
                >
                  <Download className="h-3.5 w-3.5" />
                  Şablonu İndir
                </Button>
                {ITEM_SHEETS_TEMPLATE_URL && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    type="button"
                    asChild
                  >
                    <a href={ITEM_SHEETS_TEMPLATE_URL} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Sheets
                    </a>
                  </Button>
                )}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} type="button">
              İptal
            </Button>
            <Button
              size="sm"
              onClick={() => void handleImport()}
              disabled={!canImport}
              type="button"
            >
              {draftItemIds
                ? isDraftPending
                  ? 'Aktarılıyor…'
                  : `${rows.length} Ürünü Onayla`
                : bulkCreate.isPending
                  ? 'Yükleniyor…'
                  : `${rows.length} Ürün Ekle`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
