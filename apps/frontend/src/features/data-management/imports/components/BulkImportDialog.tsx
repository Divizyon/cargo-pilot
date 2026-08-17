import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Download, ExternalLink, FileUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ImportSummaryPanel } from '@/features/data-management/imports/components/ImportSummaryPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBulkCreateItems, fetchAllItems } from '@/lib/api/useItems';
import { getApiErrorMessage, getApiValidationErrors } from '@/lib/api/apiError';
import {
  PALLET_HEIGHT_CM,
  toAllowedRotations,
  toCategory,
  toMaxWeightOnTop,
  type CreateItemRequest,
} from '@/lib/api/itemMappers';
import type { ProductType } from '@/features/data-management/products/schemas/productSchema';
import {
  useUpdateDraftItem,
  useBulkApproveDraftItems,
  type UpdateDraftItemPayload,
} from '@/lib/api/useDraftItems';
import { downloadItemImportTemplate } from '@/lib/utils/export/export-utils';
import { FRAGILITY_OPTIONS, LOAD_GROUPS, toFragilityValue } from '@/lib/config/item-import-columns';
import { DIMENSION_LABEL, ERP_TERM } from '@/lib/config/erpTerms';
import {
  deriveIncompatibleGroups,
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
  /**
   * Rota yüzeyinde çizer: modal kabuğu yerine ürün/araç ekleme sayfalarındaki kart.
   * Başlık ve açıklama sayfaya ait olduğu için burada yalnızca sayaç şeridi kalır.
   */
  asPage?: boolean;
}

// ─── Row model ────────────────────────────────────────────────────────────────

/** Sütun başlığındaki toplu doldurma seçenekleri; hücre bileşenleriyle aynı sözlükten türer. */
const LOAD_GROUP_FILL_OPTIONS = LOAD_GROUPS.map((g) => ({ value: g, label: g }));
const FRAGILITY_FILL_OPTIONS = FRAGILITY_OPTIONS.map((o) => ({
  value: String(o.value),
  label: o.label,
}));

// ─── Validation & mapping ─────────────────────────────────────────────────────

/** `validateRow` tipi bu üçlüye kısıtlar; geçersiz satır zaten aktarılamaz. */
function narrowTip(tip: string): ProductType {
  return tip === 'varil' || tip === 'palet' ? tip : 'koli';
}

/** Ürün formundaki tip kaynaklı rotasyon kilitleri gridde de uygulanır. */
function tipPatch(tip: string): Partial<EditableRow> {
  if (tip === 'varil') return { tip, allowRotateX: false, allowRotateZ: false };
  if (tip === 'palet') return { tip, allowRotateY: false, allowRotateZ: false };
  return { tip };
}

/**
 * Satırı backend sözleşmesine çevirir. Tip ve kısıt kaynaklı normalizasyon
 * (varil çapı, palet tabanı, rotasyon kilitleri) ürün formuyla birebir aynıdır.
 */
function rowToPayload(row: EditableRow): Omit<CreateItemRequest, 'sku' | 'name'> {
  const weight = Number(row.weight);
  const isStackable = row.isStackable;
  const rawMax = Math.max(Number(row.maxStackCount) || 1, 1);
  const maxStackCount = isStackable ? rawMax : 0;
  const fragilityType = Number(row.fragility) || 0;
  const isVaril = row.tip === 'varil';
  const isPalet = row.tip === 'palet';
  const width = Number(row.width);
  return {
    productType: row.tip,
    category: toCategory(narrowTip(row.tip)),
    width,
    height: isPalet ? Number(row.height) + PALLET_HEIGHT_CM : Number(row.height),
    // Varilde genişlik hücresi çapı taşır; uzunluk ondan türetilir.
    length: isVaril ? width : Number(row.length),
    diameter: isVaril ? width : null,
    weight,
    fragilityType,
    isStackable,
    maxStackCount,
    maxWeightOnTop: toMaxWeightOnTop(weight, isStackable, rawMax),
    allowedRotations: toAllowedRotations(
      row.allowRotateX && !isVaril,
      row.allowRotateY && !isPalet,
      row.allowRotateZ && fragilityType < 1 && !isVaril && !isPalet,
    ),
    constraintIds: row.constraintIds,
    // Izgara barkodu düzenlemez ama göndermek zorunda: alan atlanırsa taslak
    // güncellemesi mevcut barkodu siler.
    barcode: row.barcode,
    stackGroup: row.stackGroup || null,
    incompatibleGroups: row.incompatibleGroups,
    specialNotes: row.notes.trim() || null,
  };
}

function rowToRequest(row: EditableRow): CreateItemRequest {
  return { sku: row.sku.trim(), name: row.name.trim(), ...rowToPayload(row) };
}

function rowToUpdatePayload(row: EditableRow): UpdateDraftItemPayload {
  return rowToPayload(row);
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
          aria-label={`${rowLabel} — Yük Kısıtları: ${label}`}
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
                aria-label={opt.label}
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

// ─── Load group single-select cell ────────────────────────────────────────────

interface LoadGroupCellProps {
  rowLabel: string;
  selected: string;
  error?: string;
  onChange: (group: string) => void;
}

/** Ürün formundaki gibi tek seçim; uyumsuz gruplar seçimden türetilir. */
function LoadGroupCell({ rowLabel, selected, error, onChange }: LoadGroupCellProps) {
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`${rowLabel} — Yük Grubu: ${selected || 'Seçiniz'}`}
        className={cn(
          'h-7 border px-1 text-xs',
          error
            ? 'border-destructive bg-destructive/5 text-destructive'
            : 'border-border bg-background',
        )}
      >
        <SelectValue placeholder="Seçiniz" />
      </SelectTrigger>
      <SelectContent>
        {LOAD_GROUPS.map((g) => (
          <SelectItem key={g} value={g}>
            {g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  /** Tek seçimli sütunlarda (Yük Grubu) yalnızca son işaretlenen değer uygulanır. */
  single?: boolean;
  /** Halihazırda dolu satır sayısı; 0'dan büyükse üzerine yazma onayı istenir. */
  filledCount: number;
  onApply: (values: string[], overwrite: boolean) => void;
}

function ColumnBulkFill({ title, options, single, filledCount, onApply }: ColumnBulkFillProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  function toggle(value: string) {
    setSelected((prev) => {
      if (single) return prev.includes(value) ? [] : [value];
      return prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
    });
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
  disabled?: boolean;
  className?: string;
}

function TextCell({ value, onChange, error, type = 'text', disabled, className }: TextCellProps) {
  return (
    <Input
      type={type}
      value={value}
      title={error}
      disabled={disabled}
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

// ─── Editor shell ─────────────────────────────────────────────────────────────

interface EditorShellProps {
  asPage: boolean;
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  /** Hata ve hazır sayaçları; ikisi de sıfırken null gelir. */
  badges: ReactNode;
  /** Yalnızca sayfa kabuğunda: kartı açan bölüm başlığı. */
  sectionTitle: string;
  /** Yalnızca sayfa kabuğunda: sağ sütun. Modalde yer olmadığı için çizilmez. */
  summary: ReactNode;
  children: ReactNode;
}

/**
 * Düzenleme ızgarasının dış çerçevesi. Aynı içerik iki yüzeyde çizilir: ürün
 * ekranındaki Excel akışında modal, ERP aktarımında rota. Yalnızca kabuk değişir —
 * ızgara, doğrulama ve gönderim kodu tek yerde kalır.
 *
 * Sayfa kabuğunda başlık ve açıklama sayfaya aittir (ürün/araç ekleme sayfalarında
 * olduğu gibi kartın dışında durur), bu yüzden kart yalnızca sayaç şeridini taşır.
 */
function EditorShell({
  asPage,
  open,
  onClose,
  title,
  description,
  badges,
  sectionTitle,
  summary,
  children,
}: EditorShellProps) {
  if (asPage) {
    return (
      /*
        Ürün ve araç detay sayfalarındaki iskeletin aynısı: solda düzenleme kartı,
        sağda bilgi paneli. Oran birebir 3/5 değil — ızgara 17 sütunlu olduğu için
        panel sabit genişlikte kalır ve yalnızca xl'den itibaren çizilir; daha dar
        ekranda tablo tam genişliği kullanır.
      */
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden xl:grid-cols-5">
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card xl:col-span-3">
          {/*
            Kart, ürün ve araç formlarındaki gibi bir bölüm başlığıyla açılır; sayaçlar
            aynı satırın sağında durur. Önce yalnızca sağa yaslı bir rozet şeridi vardı
            ve kartın girişi diğer ekranlara benzemiyordu.
          */}
          <div className="flex flex-none items-center justify-between gap-3 border-b px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {sectionTitle}
            </p>
            <div className="flex items-center gap-2">{badges}</div>
          </div>
          {children}
        </div>
        <aside className="hidden min-h-0 min-w-0 xl:col-span-2 xl:flex xl:flex-col">
          {summary}
        </aside>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/*
        Bu diyalog küçük bir onay kutusu değil, sayfa boyutunda bir düzenleme yüzeyi.
        Ürün/araç ekleme sayfalarındaki kart diliyle aynı yarıçapı taşır; küçük
        diyaloglar varsayılan `rounded-lg` ile kalır.
      */}
      <DialogContent className="flex h-[78vh] w-[95vw] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
        <DialogHeader className="flex-none border-b px-6 py-4 pr-14">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {title}
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="mr-4 flex items-center gap-2">{badges}</div>
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export function BulkImportDialog({
  open,
  onOpenChange,
  initialRows,
  draftItemIds,
  mode = 'import',
  asPage = false,
}: BulkImportDialogProps) {
  const isUpdate = mode === 'update';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditableRow[]>(() => initialRows ?? []);
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  /**
   * Açılmış satırlar. Nadiren değişen alanlar (istif, katman, rotasyon, notlar)
   * ana satırdan çıkarıldı; 17 sütun sağ özet paneliyle birlikte ekrana sığmıyor
   * ve yatay kaydırma ürün adını görüş alanından çıkarıyordu. Alanlar silinmedi,
   * bir tık ötede ve düzenlenebilir. Doğrulanan sekiz alanın tamamı ana satırda
   * kalır, yani hiçbir hata buranın arkasına saklanmaz.
   */
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(() => new Set());
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
  /** Alan bazlı hata sayımı; özet panelindeki engel dökümünü besler. */
  const errorFieldCounts = validations.reduce<Record<string, number>>((acc, validation) => {
    for (const field of Object.keys(validation.errors)) {
      acc[field] = (acc[field] ?? 0) + 1;
    }
    return acc;
  }, {});
  const isDraftPending = updateDraftItem.isPending || bulkApproveDraft.isPending;
  const canImport = validRowCount > 0 && !bulkCreate.isPending && !isDraftPending;
  const confirmLabel = confirmButtonLabel({
    isPending: isDraftPending || bulkCreate.isPending,
    isUpdate,
    isDraft: Boolean(draftItemIds),
    hasErrorRows: errorRowCount > 0,
    validRowCount,
  });
  const filledLoadGroupCount = rows.filter((r) => Boolean(r.stackGroup)).length;
  const filledFragilityCount = rows.filter((r) => r.constraintIds.length > 0).length;

  function patchRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  /** Sütun başlığından toplu doldurma; dolu satırlar yalnızca 'üzerine yaz' onayıyla değişir. */
  function fillLoadGroups(groups: string[], overwrite: boolean) {
    const group = groups[0];
    if (!group) return;
    setRows((prev) =>
      prev.map((r) =>
        overwrite || !r.stackGroup
          ? { ...r, stackGroup: group, incompatibleGroups: deriveIncompatibleGroups(group) }
          : r,
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

  function readWorkbookFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      setRows(xlsxToRows(wb.Sheets[wb.SheetNames[0]]));
      setApiErrors([]);
      setRemainingNotice(null);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readWorkbookFile(file);
    if (e.target) e.target.value = '';
  }

  /** Bosluk 'sürükleyip bırakın' diyordu ama birakilan dosya hicbir sey yapmiyordu. */
  function handleFileDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readWorkbookFile(file);
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
          // Alan bazli hatalar backend zarfinda validationErrors icinde gelir; liste
          // bosalirsa tek satirlik genel mesaja duseriz.
          const failures = getApiValidationErrors(err);
          setApiErrors(
            failures.length > 0 ? failures : [getApiErrorMessage(err, 'Ürünler eklenemedi.')],
          );
        },
      },
    );
  }

  function handleClose() {
    onOpenChange(false);
    // Rota kabuğunda bileşen zaten sökülüyor; satırları burada boşaltmak gezinmeden
    // önce bir kare boş ızgara çizdirirdi.
    if (asPage) return;
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
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

  const editorTitle = isUpdate
    ? 'ERP Güncellemeyi Onayla'
    : draftItemIds
      ? ERP_TERM.approve
      : 'Toplu Ürün İçe Aktar';

  const editorDescription = (
    <>
      Hücreleri tıklayarak doğrudan düzenleyin. Kırmızı alanları düzeltin, ardından{' '}
      {draftItemIds ? 'ürünlere aktarın.' : 'içe aktarın.'}
    </>
  );

  const editorBadges =
    errorRowCount > 0 || validRowCount > 0 ? (
      <>
        {errorRowCount > 0 && (
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
            {errorRowCount} satırda hata var
          </span>
        )}
        {/* Hata rozeti token'dan geldiği için koyu temada uyum sağlıyordu; başarı
            rozetinin karşılığı olmadığından ErpConnectionStatusCard'daki aynı
            yeşil tonları kullanır. */}
        {validRowCount > 0 && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/60 dark:text-green-300">
            {validRowCount} ürün aktarıma hazır
          </span>
        )}
      </>
    ) : null;

  return (
    <EditorShell
      asPage={asPage}
      open={open}
      onClose={handleClose}
      title={editorTitle}
      description={editorDescription}
      badges={editorBadges}
      sectionTitle={`${isUpdate ? 'Güncellenecek' : 'Aktarılacak'} Ürünler (${rows.length})`}
      summary={
        <ImportSummaryPanel
          rows={rows}
          errorRowCount={errorRowCount}
          validRowCount={validRowCount}
          errorFieldCounts={errorFieldCounts}
        />
      }
    >
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

      {/*
        Alt boşluk yüzen aksiyon çubuğunun altında satır bırakmaz. Yatay kaydırma
        açık: sağ özet paneli ürün/araç sayfalarındaki 2/5 oranına çıkınca ızgaraya
        ~990px kalıyor ve 17 sütun oraya sığmıyor. `ProductTable` ve `ERPItemsTable`
        da geniş tabloları aynı şekilde `min-w` + yatay kaydırma ile çözüyor.
      */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
            {/*
              Harf aralığı bilinçli olarak dar: `table-fixed` altında sütunlar yüzdeyle
              bölüşüyor ve başlıklar `whitespace-nowrap`. `tracking-widest` denendi ve
              "GENİŞLİK (X) *" gibi başlıkları hücresinden taşırıp komşusunun üstüne
              bindirdi. Bölüm başlığında yer bol olduğu için orada geniş aralık kalabilir.
            */}
            <tr className="text-left align-top text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {/*
                Yüzdeler + sabit sütunlar %100'ü aşmamalı. İkinci sütun satır açıcıdır;
                nadiren değişen alanlar oraya taşındığı için ana satır artık yatay
                kaydırma olmadan sığıyor.

                Başlıklarda `whitespace-nowrap` yok: uzun etiket hücresine sığmayınca
                komşusunun üstüne binmek yerine alt satıra geçer.
              */}
              <th className="w-7 border-b px-1 py-1.5 text-center">#</th>
              <th className="w-8 border-b px-1 py-1.5">
                <span className="sr-only">Ayrıntıyı aç</span>
              </th>
              <th className="w-[16%] border-b px-2 py-1.5">Ürün Adı *</th>
              <th className="w-[10%] border-b px-2 py-1.5">SKU *</th>
              <th className="w-[10%] border-b px-2 py-1.5">Tip *</th>
              <th className="w-[8%] border-b px-2 py-1.5">{DIMENSION_LABEL.width} *</th>
              <th className="w-[8%] border-b px-2 py-1.5">{DIMENSION_LABEL.height} *</th>
              <th className="w-[8%] border-b px-2 py-1.5">{DIMENSION_LABEL.length} *</th>
              <th className="w-[8%] border-b px-2 py-1.5">Ağırlık *</th>
              {/*
                Toplu doldurma düğmesi etiketin altında durur. `justify-between` ile
                yan yanayken etiket iki satıra düştüğü anda düğme sağda asılı kalıyor
                ve hangi sütuna ait olduğu okunmuyordu.
              */}
              <th className="w-[11%] border-b px-2 py-1.5 align-top">
                <div className="flex flex-col items-start gap-1">
                  <span>Yük Kısıtları</span>
                  <ColumnBulkFill
                    title="Yük Kısıtları"
                    options={FRAGILITY_FILL_OPTIONS}
                    filledCount={filledFragilityCount}
                    onApply={(values, overwrite) => fillFragility(values.map(Number), overwrite)}
                  />
                </div>
              </th>
              <th className="w-[12%] border-b px-2 py-1.5 align-top">
                <div className="flex flex-col items-start gap-1">
                  <span>Yük Grubu *</span>
                  <ColumnBulkFill
                    title="Yük Grubu"
                    options={LOAD_GROUP_FILL_OPTIONS}
                    single
                    filledCount={filledLoadGroupCount}
                    onApply={fillLoadGroups}
                  />
                </div>
              </th>
              <th className="w-8 border-b px-1 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const errs = validations.find((v) => v.id === row._id)?.errors ?? {};
              const hasRowError = Object.keys(errs).length > 0;
              // Aynı görünen hücre kontrolleri ekran okuyucuda satırla birlikte anılır.
              const rowLabel = row.name.trim() || `${idx + 1}. satır`;
              const isExpanded = expandedRowIds.has(row._id);
              return (
                <Fragment key={row._id}>
                  <tr
                    className={cn(
                      'transition-colors',
                      hasRowError ? 'bg-destructive/[0.04]' : 'hover:bg-muted/30',
                    )}
                  >
                    {/* Row number */}
                    <td className="border-b border-border/40 px-1 py-0.5 text-center text-[10px] text-muted-foreground">
                      {idx + 1}
                    </td>

                    {/* Ayrıntı açıcı */}
                    <td className="border-b border-border/40 px-1 py-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={`${rowLabel} — ek alanlar`}
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedRowIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(row._id)) next.delete(row._id);
                            else next.add(row._id);
                            return next;
                          })
                        }
                      >
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            isExpanded && 'rotate-180',
                          )}
                        />
                      </Button>
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
                      <Select value={row.tip} onValueChange={(v) => patchRow(row._id, tipPatch(v))}>
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

                    {/* Uzunluk (Z) — varilde çap genişlikten okunur, hücre düzenlenmez. */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <TextCell
                        value={row.tip === 'varil' ? row.width : row.length}
                        onChange={(v) => patchRow(row._id, { length: v })}
                        error={errs.length}
                        type="number"
                        disabled={row.tip === 'varil'}
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

                    {/* Yük Kısıtları */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <FragilityCell
                        rowLabel={rowLabel}
                        constraintIds={row.constraintIds}
                        onChange={(ids) => {
                          const fragility = toFragilityValue(ids);
                          patchRow(row._id, {
                            constraintIds: ids,
                            fragility: String(fragility),
                            // Kısıtlı ürün ters çevrilemez; ürün formuyla aynı kural.
                            ...(fragility >= 1 ? { allowRotateZ: false } : {}),
                          });
                        }}
                      />
                    </td>

                    {/* Yük Grubu */}
                    <td className="border-b border-border/40 px-2 py-0.5">
                      <LoadGroupCell
                        rowLabel={rowLabel}
                        selected={row.stackGroup}
                        error={errs.stackGroup}
                        onChange={(group) =>
                          patchRow(row._id, {
                            stackGroup: group,
                            incompatibleGroups: deriveIncompatibleGroups(group),
                          })
                        }
                      />
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

                  {/*
                  Ana satırdan çıkarılan alanlar. Hiçbiri silinmedi; burada etiketli
                  olarak ve ürün formundaki bölüm diliyle duruyorlar. Notlar burada
                  tam genişlik bulur — ızgarada tek hücreye sıkışıyordu.
                */}
                  {isExpanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={12} className="border-b border-border/40 px-4 py-3">
                        {/*
                          Tek sıra: sayısal alan solda, kutucuk grupları yan yana,
                          notlar en sağda kalan genişliği alır.
                        */}
                        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                          <div className="flex w-24 shrink-0 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Katman Sayısı
                            </span>
                            <TextCell
                              value={row.maxStackCount}
                              onChange={(v) => patchRow(row._id, { maxStackCount: v })}
                              type="number"
                            />
                          </div>

                          {/* X/Y/Z rotasyon — tip ve kısıt kaynaklı kilitler ürün formundaki gibidir. */}
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Eksen Rotasyonu
                            </span>
                            <div className="flex h-7 items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Checkbox
                                  aria-label={`${rowLabel} — X ekseni`}
                                  checked={row.allowRotateX}
                                  disabled={row.tip === 'varil'}
                                  onCheckedChange={(checked) =>
                                    patchRow(row._id, { allowRotateX: Boolean(checked) })
                                  }
                                  className="h-4 w-4"
                                />
                                X
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Checkbox
                                  aria-label={`${rowLabel} — Y ekseni`}
                                  checked={row.allowRotateY}
                                  disabled={row.tip === 'palet'}
                                  onCheckedChange={(checked) =>
                                    patchRow(row._id, { allowRotateY: Boolean(checked) })
                                  }
                                  className="h-4 w-4"
                                />
                                Y
                              </label>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Checkbox
                                  aria-label={`${rowLabel} — Z ekseni`}
                                  checked={row.allowRotateZ}
                                  disabled={
                                    Number(row.fragility) >= 1 ||
                                    row.tip === 'varil' ||
                                    row.tip === 'palet'
                                  }
                                  onCheckedChange={(checked) =>
                                    patchRow(row._id, { allowRotateZ: Boolean(checked) })
                                  }
                                  className="h-4 w-4"
                                />
                                Z
                              </label>
                            </div>
                          </div>

                          {/* İstif kutucuğu rotasyon kutucuklarının yanında durur. */}
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              İstiflenebilir
                            </span>
                            <div className="flex h-7 items-center">
                              <Checkbox
                                aria-label={`${rowLabel} — İstiflenebilir`}
                                checked={row.isStackable}
                                onCheckedChange={(checked) =>
                                  patchRow(row._id, { isStackable: Boolean(checked) })
                                }
                                className="h-4 w-4"
                              />
                            </div>
                          </div>

                          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              Özel Taşıma Notları
                            </span>
                            <TextCell
                              value={row.notes}
                              onChange={(v) => patchRow(row._id, { notes: v })}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/*
          Yüzen aksiyon çubuğu: ürün ve araç formlarındaki desenin aynısı. Kullanıcı bu
          ekrana zaten aynı biçimdeki bir çubuktan geliyor; sabit alt şerit geçişi
          bozuyordu. Kaydırma alanındaki `pb-24` çubuğun altında satır bırakmaz.
        */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
          {/*
              ERP onay akisinda elle satir eklenemez: satirin karsiligi olan taslak
              olmadigi icin onayda sessizce dusuyordu. Yeni urun tekil urun formundan
              ya da Excel aktarimindan eklenir.
            */}
          {!draftItemIds && (
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
          )}
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
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" type="button" asChild>
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
          {/* Yardımcı aksiyonlarla kesinleştirme aksiyonlarını ayırır; ERP akışında
                soldaki grup hiç çizilmediği için ayraç da çizilmez. */}
          {!draftItemIds && <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />}
          <Button variant="outline" size="sm" onClick={handleClose} type="button">
            İptal
          </Button>
          <Button size="sm" onClick={() => void handleImport()} disabled={!canImport} type="button">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </EditorShell>
  );
}
