import { useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  type UpdateDraftItemPayload,
} from '@/lib/api/useDraftItems';
import { downloadItemImportTemplate } from '@/lib/utils/export/export-utils';
import { FRAGILITY_OPTIONS, LOAD_GROUPS, toFragilityValue } from '@/lib/config/item-import-columns';
import { DIMENSION_LABEL, ERP_TERM } from '@/lib/config/erpTerms';
import {
  emptyRow,
  validateRow,
  xlsxToRows,
  type EditableRow,
} from '@/features/data-management/imports/utils/itemImportRow';

export type { EditableRow } from '@/features/data-management/imports/utils/itemImportRow';

// Google Sheets şablonu oluşturulduğunda bu URL'i buraya ekleyin
const ITEM_SHEETS_TEMPLATE_URL = '';

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

/** Sütun başlığındaki toplu doldurma seçenekleri; hücre bileşenleriyle aynı sözlükten türer. */
const LOAD_GROUP_FILL_OPTIONS = LOAD_GROUPS.map((g) => ({ value: g, label: g }));
const FRAGILITY_FILL_OPTIONS = FRAGILITY_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

// ─── Validation & mapping ─────────────────────────────────────────────────────

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
    incompatibleGroups: row.incompatibleGroups,
    specialNotes: row.notes.trim() || null,
  };
}

// ─── Fragility multi-select cell ──────────────────────────────────────────────

/** Yoğun grid'de hücre tetikleyicileri aynı ölçüde kalsın diye tek yerde tutulur. */
const CELL_TRIGGER_CLASS =
  'h-7 w-full justify-between gap-1 px-1.5 text-xs font-normal hover:bg-muted/50';

interface FragilityCellProps {
  rowLabel: string;
  constraintIds: number[];
  onChange: (ids: number[]) => void;
}

function FragilityCell({ rowLabel, constraintIds, onChange }: FragilityCellProps) {
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
        <Button
          type="button"
          variant="outline"
          aria-label={`${rowLabel} — Kırılganlık: ${label}`}
          className={cn(
            CELL_TRIGGER_CLASS,
            constraintIds.length > 0 ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
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
  rowLabel: string;
  selected: string[];
  error?: string;
  onChange: (groups: string[]) => void;
}

function LoadGroupCell({ rowLabel, selected, error, onChange }: LoadGroupCellProps) {
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
        <Button
          type="button"
          variant="outline"
          aria-label={`${rowLabel} — Yük Grubu: ${label}`}
          aria-invalid={Boolean(error)}
          className={cn(
            CELL_TRIGGER_CLASS,
            error
              ? 'border-destructive bg-destructive/5 text-destructive'
              : selected.length > 0
                ? 'text-foreground'
                : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
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

// ─── Column bulk fill (header) ────────────────────────────────────────────────

interface BulkFillOption {
  value: string;
  label: string;
}

interface ColumnBulkFillProps {
  title: string;
  options: readonly BulkFillOption[];
  /** Halihazırda dolu satır sayısı; 0'dan büyükse üzerine yazma onayı istenir. */
  filledCount: number;
  onApply: (values: string[], overwrite: boolean) => void;
}

function ColumnBulkFill({ title, options, filledCount, onApply }: ColumnBulkFillProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  function reset() {
    setSelected([]);
    setOverwrite(false);
  }

  function apply() {
    onApply(selected, overwrite);
    setOpen(false);
    reset();
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${title} sütununu toplu doldur`}
          className="h-5 gap-0.5 px-1 py-0 text-[10px] font-medium normal-case text-muted-foreground hover:bg-muted"
        >
          Tümü
          <ChevronDown className="h-2.5 w-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="mb-1.5 text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
          {title} — tüm satırlara uygula
        </p>
        <div className="space-y-1">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs font-normal normal-case tracking-normal hover:bg-muted"
            >
              <Checkbox
                aria-label={opt.label}
                checked={selected.includes(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        {filledCount > 0 && (
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded border-t px-1 pt-2 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
            <Checkbox
              aria-label="Dolu satırların üzerine yaz"
              checked={overwrite}
              onCheckedChange={(c) => setOverwrite(Boolean(c))}
            />
            Dolu {filledCount} satırın üzerine yaz
          </label>
        )}
        <Button
          type="button"
          size="sm"
          className="mt-2 h-7 w-full text-xs"
          disabled={selected.length === 0}
          onClick={apply}
        >
          Uygula
        </Button>
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

interface ConfirmLabelInput {
  isPending: boolean;
  isUpdate: boolean;
  isDraft: boolean;
  hasErrorRows: boolean;
  validRowCount: number;
}

/** Hatalı satır varken buton yalnızca geçerli satırları aktaracağını söyler. */
function confirmButtonLabel({
  isPending,
  isUpdate,
  isDraft,
  hasErrorRows,
  validRowCount,
}: ConfirmLabelInput): string {
  if (isPending) {
    if (isUpdate) return 'Güncelleniyor…';
    return isDraft ? 'Aktarılıyor…' : 'Yükleniyor…';
  }
  if (hasErrorRows) return `Geçerli satırları aktar (${validRowCount})`;
  if (isDraft) return isUpdate ? `${validRowCount} Ürünü Güncelle` : `${validRowCount} Ürünü Aktar`;
  return `${validRowCount} Ürün Ekle`;
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
  /** Kısmi aktarım sonrası diyalogda kalan satırların özeti. */
  const [remainingNotice, setRemainingNotice] = useState<string | null>(null);

  const bulkCreate = useBulkCreateItems();
  const updateDraftItem = useUpdateDraftItem();
  const bulkApproveDraft = useBulkApproveDraftItems();

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

  /**
   * Güncelleme akışında satır, zaten var olan bir ürünün kendisidir; kendi SKU'su
   * çakışma sayılırsa tüm satırlar kilitlenir. Başka bir kaydın SKU'su çakışma kalır.
   */
  const ownSkuByRowId = useMemo(() => {
    const map = new Map<string, string>();
    if (!isUpdate) return map;
    for (const row of initialRows ?? []) {
      map.set(row._id, row.sku.trim().toLowerCase());
    }
    return map;
  }, [isUpdate, initialRows]);

  const duplicateSkuIds = findDuplicateSkuIds(rows);
  const validations = rows.map((r) => {
    const skuKey = r.sku.trim().toLowerCase();
    const isOwnSku = Boolean(skuKey) && ownSkuByRowId.get(r._id) === skuKey;
    return {
      id: r._id,
      errors: {
        ...validateRow(r),
        ...(duplicateSkuIds.has(r._id)
          ? { sku: 'Bu SKU başka bir satırda zaten kullanılıyor' }
          : {}),
        ...(skuKey && !isOwnSku && existingSkus.has(skuKey) ? { sku: 'Bu SKU kullanılıyor' } : {}),
      },
    };
  });
  const errorRowIds = new Set(
    validations.filter((v) => Object.keys(v.errors).length > 0).map((v) => v.id),
  );
  const errorRowCount = errorRowIds.size;
  const validRowCount = rows.length - errorRowCount;
  const isDraftPending = updateDraftItem.isPending || bulkApproveDraft.isPending;
  const canImport = validRowCount > 0 && !bulkCreate.isPending && !isDraftPending;
  const confirmLabel = confirmButtonLabel({
    isPending: isDraftPending || bulkCreate.isPending,
    isUpdate,
    isDraft: Boolean(draftItemIds),
    hasErrorRows: errorRowCount > 0,
    validRowCount,
  });
  const filledLoadGroupCount = rows.filter((r) => r.incompatibleGroups.length > 0).length;
  const filledFragilityCount = rows.filter((r) => r.constraintIds.length > 0).length;

  function patchRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  /** Sütun başlığından toplu doldurma; dolu satırlar yalnızca 'üzerine yaz' onayıyla değişir. */
  function fillLoadGroups(groups: string[], overwrite: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        overwrite || r.incompatibleGroups.length === 0 ? { ...r, incompatibleGroups: groups } : r,
      ),
    );
  }

  function fillFragility(constraintIds: number[], overwrite: boolean) {
    setRows((prev) =>
      prev.map((r) =>
        overwrite || r.constraintIds.length === 0
          ? { ...r, constraintIds, fragility: String(toFragilityValue(constraintIds)) }
          : r,
      ),
    );
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      setRows(xlsxToRows(wb.Sheets[wb.SheetNames[0]]));
      setApiErrors([]);
      setRemainingNotice(null);
    };
    reader.readAsArrayBuffer(file);
    if (e.target) e.target.value = '';
  }

  /** Aktarılamayan satırlar diyalogda kalır; hepsi geçtiyse diyalog kapanır. */
  function finishImport(remaining: EditableRow[]) {
    if (remaining.length === 0) {
      handleClose();
      return;
    }
    setRows(remaining);
    setRemainingNotice(`${remaining.length} satır hata nedeniyle bekliyor.`);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => !errorRowIds.has(r._id));
    const invalidRows = rows.filter((r) => errorRowIds.has(r._id));
    if (validRows.length === 0) return;
    setApiErrors([]);
    setRemainingNotice(null);

    if (draftItemIds) {
      const approvableRows = validRows.filter((row) => draftItemIds[row._id]);
      if (approvableRows.length === 0) return;
      try {
        await Promise.all(
          approvableRows.map((row) =>
            updateDraftItem.mutateAsync({
              id: draftItemIds[row._id],
              payload: rowToUpdatePayload(row),
            }),
          ),
        );
        const result = await bulkApproveDraft.mutateAsync(
          approvableRows.map((row) => draftItemIds[row._id]),
        );
        const skippedIds = new Set(result.skippedItems.map((s) => s.id.toLowerCase()));
        const skippedRows = approvableRows.filter((row) =>
          skippedIds.has(draftItemIds[row._id].toLowerCase()),
        );
        setApiErrors(result.skippedItems.map((s) => `${s.sku || '—'}: ${s.reason}`));
        finishImport([...invalidRows, ...skippedRows]);
      } catch {
        // errors surfaced via toasts in mutation hooks
      }
      return;
    }

    bulkCreate.mutate(
      { items: validRows.map(rowToRequest) },
      {
        onSuccess: () => finishImport(invalidRows),
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
    setRemainingNotice(null);
  }

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
                    ? ERP_TERM.approve
                    : 'Toplu Ürün İçe Aktar'}
              </DialogTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hücreleri tıklayarak doğrudan düzenleyin. Kırmızı alanları düzeltin, ardından{' '}
                {draftItemIds ? 'ürünlere aktarın.' : 'içe aktarın.'}
              </p>
            </div>
            <div className="mr-4 flex items-center gap-2">
              {errorRowCount > 0 && (
                <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                  {errorRowCount} satırda hata var
                </span>
              )}
              {validRowCount > 0 && (
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  {validRowCount} ürün aktarıma hazır
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Kısmi aktarım özeti */}
        {remainingNotice && (
          <div className="flex-none border-b border-amber-200 bg-amber-50 px-6 py-2" role="status">
            <p className="text-xs font-medium text-amber-800">{remainingNotice}</p>
          </div>
        )}

        {/* API errors */}
        {apiErrors.length > 0 && (
          <div className="flex-none border-b border-destructive/20 bg-destructive/5 px-6 py-2">
            <p className="mb-1 text-xs font-semibold text-destructive">
              {draftItemIds
                ? `${apiErrors.length} satır atlandı:`
                : `Sunucu ${apiErrors.length} satırı reddetti:`}
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
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-7 border-b px-1 py-1.5 text-center">#</th>
                <th className="w-[11%] whitespace-nowrap border-b px-2 py-1.5">Ürün Adı *</th>
                <th className="w-[8%] whitespace-nowrap border-b px-2 py-1.5">SKU *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Tip *</th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">
                  {DIMENSION_LABEL.width} *
                </th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">
                  {DIMENSION_LABEL.height} *
                </th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">
                  {DIMENSION_LABEL.length} *
                </th>
                <th className="w-[7%] whitespace-nowrap border-b px-2 py-1.5">Ağırlık *</th>
                <th className="w-[9%] whitespace-nowrap border-b px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    Kırılganlık
                    <ColumnBulkFill
                      title="Kırılganlık"
                      options={FRAGILITY_FILL_OPTIONS}
                      filledCount={filledFragilityCount}
                      onApply={(values, overwrite) => fillFragility(values.map(Number), overwrite)}
                    />
                  </div>
                </th>
                <th className="w-[11%] whitespace-nowrap border-b px-2 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    Yük Grubu *
                    <ColumnBulkFill
                      title="Yük Grubu"
                      options={LOAD_GROUP_FILL_OPTIONS}
                      filledCount={filledLoadGroupCount}
                      onApply={fillLoadGroups}
                    />
                  </div>
                </th>
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
                // Aynı görünen hücre kontrolleri ekran okuyucuda satırla birlikte anılır.
                const rowLabel = row.name.trim() || `${idx + 1}. satır`;
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

                    {/* Derinlik (Z) */}
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

                    {/* Kırılganlık */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <FragilityCell
                        rowLabel={rowLabel}
                        constraintIds={row.constraintIds}
                        onChange={(ids) =>
                          patchRow(row._id, {
                            constraintIds: ids,
                            fragility: String(toFragilityValue(ids)),
                          })
                        }
                      />
                    </td>

                    {/* Yük Grubu */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <LoadGroupCell
                        rowLabel={rowLabel}
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
                        aria-label={`${rowLabel} satırını sil`}
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
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
