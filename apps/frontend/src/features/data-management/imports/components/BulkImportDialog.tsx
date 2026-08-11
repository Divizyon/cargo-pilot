import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, ExternalLink, FileUp, Plus, Trash2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBulkCreateItems, fetchAllItems, type BackendError } from '@/lib/api/useItems';
import {
  ITEM_CATEGORY,
  toAllowedRotations,
  toMaxWeightOnTop,
  type CreateItemRequest,
} from '@/lib/api/itemMappers';
import {
  useUpdateDraftItem,
  useBulkApproveDraftItems,
  useBulkApproveItemsIndividual,
  type UpdateDraftItemPayload,
} from '@/lib/api/useDraftItems';
import { downloadItemImportTemplate } from '@/lib/utils/export/export-utils';

// Google Sheets şablonu oluşturulduğunda bu URL'i buraya ekleyin
const ITEM_SHEETS_TEMPLATE_URL = '';

const FRAGILITY_OPTIONS = [
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

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRows?: EditableRow[];
  /** Maps row._id → draft item backend id. When present, PUT+approve-bulk is used instead of bulk-create. */
  draftItemIds?: Record<string, string>;
  /** 'update' mode changes dialog title and confirm button text for UpdatePending flow. */
  mode?: 'import' | 'update';
}

// ─── Row model ────────────────────────────────────────────────────────────────

const LOAD_GROUPS = ['Kimya', 'Tehlikeli Madde', 'Gıda', 'Elektronik', 'Tekstil', 'Genel'] as const;

const editableRowSchema = z.object({
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

type RowErrors = Partial<
  Record<
    'sku' | 'name' | 'tip' | 'width' | 'height' | 'length' | 'weight' | 'incompatibleGroups',
    string
  >
>;

// ─── Validation & mapping ─────────────────────────────────────────────────────

/** ERP'den eksik gelen alan, kullanıcı hatası değildir; mesaj bunu ayırt eder. */
function numericFieldError(row: EditableRow, field: string, value: string): string | undefined {
  if (value && Number(value) > 0) return undefined;
  return row.missingFields.includes(field) ? 'ERP’de eksik' : 'Pozitif sayı';
}

function validateRow(row: EditableRow): RowErrors {
  const e: RowErrors = {};
  if (!row.sku.trim()) e.sku = 'Zorunlu alan';
  if (!row.name.trim()) e.name = 'Zorunlu alan';
  if (!['koli', 'varil', 'palet'].includes(row.tip)) e.tip = 'koli / varil / palet';
  e.width = numericFieldError(row, 'width', row.width);
  e.height = numericFieldError(row, 'height', row.height);
  e.length = numericFieldError(row, 'length', row.length);
  e.weight = numericFieldError(row, 'weight', row.weight);
  if (row.incompatibleGroups.length === 0) e.incompatibleGroups = 'Zorunlu alan';
  for (const key of Object.keys(e) as Array<keyof RowErrors>) {
    if (e[key] === undefined) delete e[key];
  }
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
  const fragilityType = Number(row.fragility) || 0;
  return {
    sku: row.sku.trim(),
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
    constraintIds: row.constraintIds,
    stackGroup: row.incompatibleGroups[0] ?? null,
    incompatibleGroups: row.incompatibleGroups,
    specialNotes: row.notes.trim() || null,
  };
}

function rowToUpdatePayload(row: EditableRow): UpdateDraftItemPayload {
  const weight = Number(row.weight);
  const isStackable = row.isStackable;
  const rawMax = Math.max(Number(row.maxStackCount) || 1, 1);
  const maxStackCount = isStackable ? rawMax : 0;
  const fragilityType = Number(row.fragility) || 0;
  return {
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
    constraintIds: row.constraintIds,
    stackGroup: row.incompatibleGroups[0] ?? null,
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
      constraintIds: (() => {
        const v = Number(r['Kırılganlık (0=Normal/1=Kırılgan/2=Sıvı)'] ?? 0);
        return v > 0 ? [v] : [];
      })(),
      incompatibleGroups: String(r['Yük Grubu'] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => (LOAD_GROUPS as readonly string[]).includes(s)),
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
    name: '',
    tip: '',
    width: '',
    height: '',
    length: '',
    weight: '',
    fragility: '0',
    constraintIds: [],
    incompatibleGroups: [],
    isStackable: false,
    maxStackCount: '1',
    allowRotateX: true,
    allowRotateY: true,
    allowRotateZ: true,
    notes: '',
  });
}

// ─── Fragility multi-select cell ──────────────────────────────────────────────

interface FragilityCellProps {
  constraintIds: number[];
  onChange: (ids: number[]) => void;
}

function FragilityCell({ constraintIds, onChange }: FragilityCellProps) {
  const selected = new Set(constraintIds);

  const label =
    constraintIds.length === 0
      ? 'Normal'
      : constraintIds.length === 1
        ? (FRAGILITY_OPTIONS.find((o) => o.value === constraintIds[0])?.label ?? '—')
        : `${constraintIds.length} tür`;

  function toggle(val: number) {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onChange(Array.from(next));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-7 w-full items-center justify-between gap-1 rounded border px-1.5 text-xs',
            'border-border bg-background hover:bg-muted/50',
            constraintIds.length > 0 ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2" align="start">
        <div className="space-y-1">
          {FRAGILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Load group multi-select cell ─────────────────────────────────────────────

interface LoadGroupCellProps {
  selected: string[];
  error?: string;
  onChange: (groups: string[]) => void;
}

function LoadGroupCell({ selected, error, onChange }: LoadGroupCellProps) {
  const set = new Set(selected);

  const label =
    selected.length === 0
      ? 'Seçiniz'
      : selected.length === 1
        ? selected[0]
        : `${selected[0]}, ${selected.slice(1).join(', ')}`.slice(0, 16) +
          (selected.length > 1 ? '…' : '');

  function toggle(g: string) {
    const next = new Set(set);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    onChange(Array.from(next));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-7 w-full items-center justify-between gap-1 rounded border px-1.5 text-xs',
            error
              ? 'border-destructive bg-destructive/5 text-destructive'
              : selected.length > 0
                ? 'border-border bg-background text-foreground'
                : 'border-border bg-background text-muted-foreground',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          {LOAD_GROUPS.map((g) => (
            <label
              key={g}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
            >
              <Checkbox checked={set.has(g)} onCheckedChange={() => toggle(g)} />
              {g}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
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

function findDuplicateSkuIds(rows: EditableRow[]): Set<string> {
  const skuCount = new Map<string, number>();
  for (const row of rows) {
    const sku = row.sku.trim().toLowerCase();
    if (!sku) continue;
    skuCount.set(sku, (skuCount.get(sku) ?? 0) + 1);
  }
  return new Set(
    rows
      .filter((r) => {
        const sku = r.sku.trim().toLowerCase();
        return sku && (skuCount.get(sku) ?? 0) > 1;
      })
      .map((r) => r._id),
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function BulkImportDialog({
  open,
  onOpenChange,
  initialRows,
  draftItemIds,
  mode = 'import',
}: BulkImportDialogProps) {
  const isUpdate = mode === 'update';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>(() => initialRows ?? []);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const bulkCreate = useBulkCreateItems();
  const updateDraftItem = useUpdateDraftItem();
  const bulkApproveDraft = useBulkApproveDraftItems();
  const bulkApproveIndividual = useBulkApproveItemsIndividual();

  const { data: existingItems } = useQuery({
    queryKey: ['items-all-skus'] as const,
    queryFn: () => fetchAllItems(),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const existingSkus = useMemo(
    () => new Set((existingItems ?? []).map((item) => item.sku.toLowerCase())),
    [existingItems],
  );

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
        if (mode === 'update') {
          await bulkApproveDraft.mutateAsync(ids);
        } else {
          await bulkApproveIndividual.mutateAsync(ids);
        }
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
          const errData = (err as AxiosError<BackendError>).response?.data?.error;
          const failures = errData?.validationFailures;
          const message = errData?.message;
          if (failures?.length) {
            setApiErrors(
              failures.map((f) => [f.propertyName, f.errorMessage].filter(Boolean).join(': ')),
            );
          } else if (message) {
            setApiErrors([message]);
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

  const duplicateSkuIds = findDuplicateSkuIds(rows);
  const validations = rows.map((r) => {
    const skuKey = r.sku.trim().toLowerCase();
    return {
      id: r._id,
      errors: {
        ...validateRow(r),
        ...(duplicateSkuIds.has(r._id)
          ? { sku: 'Bu SKU başka bir satırda zaten kullanılıyor' }
          : {}),
        ...(skuKey && existingSkus.has(skuKey) ? { sku: 'Bu SKU kullanılıyor' } : {}),
      },
    };
  });
  const errorRowCount = validations.filter((v) => Object.keys(v.errors).length > 0).length;
  const isDraftPending =
    updateDraftItem.isPending || bulkApproveDraft.isPending || bulkApproveIndividual.isPending;
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
                {isUpdate
                  ? 'ERP Güncellemeyi Onayla'
                  : draftItemIds
                    ? 'Taslak Ürünleri Onayla'
                    : 'Toplu Ürün İçe Aktar'}
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
                  {rows.length} ürün aktarıma hazır
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
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Tip *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Uzunluk/Çap (X) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Yükseklik (Y) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Derinlik (Z) *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Ağırlık *</th>
                <th className="w-[9%] whitespace-nowrap border-b px-2 py-1.5">Kırılganlık</th>
                <th className="w-[11%] whitespace-nowrap border-b px-2 py-1.5">Yük Grubu *</th>
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
                          <SelectItem value="palet">Paletli Ürün</SelectItem>
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
                      <FragilityCell
                        constraintIds={row.constraintIds}
                        onChange={(ids) =>
                          patchRow(row._id, {
                            constraintIds: ids,
                            fragility: ids.length > 0 ? String(Math.max(...ids)) : '0',
                          })
                        }
                      />
                    </td>

                    {/* Yük Grubu */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <LoadGroupCell
                        selected={row.incompatibleGroups}
                        error={errs.incompatibleGroups}
                        onChange={(groups) => patchRow(row._id, { incompatibleGroups: groups })}
                      />
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
                      <TooltipProvider delayDuration={300}>
                        <Tooltip open={row.notes.trim() ? undefined : false}>
                          <TooltipTrigger asChild>
                            <div>
                              <TextCell
                                value={row.notes}
                                onChange={(v) => patchRow(row._id, { notes: v })}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-64 whitespace-pre-wrap break-words"
                          >
                            {row.notes}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                  ? isUpdate
                    ? 'Güncelleniyor…'
                    : 'Aktarılıyor…'
                  : isUpdate
                    ? `${rows.length} Ürünü Güncelle`
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
