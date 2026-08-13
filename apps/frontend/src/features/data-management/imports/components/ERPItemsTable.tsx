import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FilterTabs } from '@/components/shared/FilterTabs';
import {
  AlertTriangle,
  Check,
  PackageSearch,
  PlugZap,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useERPConnection, useERPSettings, useTriggerERPSync } from '@/lib/api/useERPIntegration';
import {
  useDraftItems,
  useBulkRejectDraftItems,
  useReinstateDraftItems,
  type DraftItem,
  DRAFT_FIELD,
  DRAFT_PENDING,
  DRAFT_APPROVED,
  DRAFT_REJECTED,
  DRAFT_UPDATE_PENDING,
  DRAFT_UPDATE_DISMISSED,
} from '@/lib/api/useDraftItems';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay, formatWeightDisplay } from '@/lib/utils/format/unitConversion';
import { draftItemToRow } from '@/features/data-management/imports/utils/draftItemToRow';
import {
  DIMENSION_LABEL,
  DIMENSION_SHORT_LABEL,
  ERP_SETTINGS_ROUTE,
  ERP_SOURCE_MISSING,
  ERP_TERM,
} from '@/lib/config/erpTerms';
import { draftProductType } from '@/lib/config/productTypeDisplay';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { ITEM_CATEGORY } from '@/lib/api/itemMappers';
import { ProductTypeCell } from '@/components/shared/ProductTypeCell';
import type { ProductType } from '@/features/data-management/products/schemas/productSchema';
import { BulkImportDialog, type EditableRow } from './BulkImportDialog';
import { ErpSyncRequirementsDialog } from './ErpSyncRequirementsDialog';
import { collectMissingSyncRequirements } from '@/features/data-management/imports/utils/erpSyncRequirements';
import { ErpProviderMark } from '@/components/shared/ErpProviderMark';
import { EmptyState } from '@/components/shared/EmptyState';
import { SearchInput } from '@/components/shared/SearchInput';
import { QueryErrorState } from '@/components/shared/QueryErrorState';

const ROW_H = 48;

const MISSING_FIELD_LABEL: Record<string, string> = {
  [DRAFT_FIELD.Width]: DIMENSION_SHORT_LABEL.width,
  [DRAFT_FIELD.Height]: DIMENSION_SHORT_LABEL.height,
  [DRAFT_FIELD.Length]: DIMENSION_SHORT_LABEL.length,
  [DRAFT_FIELD.Weight]: DIMENSION_SHORT_LABEL.weight,
};

type TypeFilterKey = ProductType | typeof ERP_SOURCE_MISSING.label;

/**
 * ERP grup kodundan çözülen kategori (Koli/Varil/Palet) tip için güvenilirdir; yalnızca
 * grup kodu boş/bilinmeyen satırlar (Package) '?' kovasına düşer. `fromCategory` Package'ı
 * 'varil'e düşürdüğü için Package burada ayrıca elenir.
 */
function hasKnownCategory(item: DraftItem): boolean {
  return item.category !== ITEM_CATEGORY.Package;
}

/** Tip filtresinin satır anahtarı; kategorisi bilinmeyen taslak '?' kovasında toplanır. */
function categoryFilterKey(category: number): TypeFilterKey {
  return category === ITEM_CATEGORY.Package ? ERP_SOURCE_MISSING.label : draftProductType(category);
}

/** Filtre anahtarından kategoriye geri dönüş; eşleme birebirdir. */
const CATEGORY_BY_FILTER_KEY = new Map<TypeFilterKey, number>(
  Object.values(ITEM_CATEGORY).map((category) => [categoryFilterKey(category), category]),
);

/**
 * Filtre seçeneklerini sunucudan gelen kategori kümesinden kurar. Açık sayfadan
 * türetilseydi seçenekler sayfa değiştikçe kaybolurdu.
 */
function toTypeOptions(categories: readonly number[]): TypeFilterKey[] {
  const known = Array.from(
    new Set(categories.filter((c) => c !== ITEM_CATEGORY.Package).map(draftProductType)),
  ).sort();
  return categories.includes(ITEM_CATEGORY.Package) ? [...known, ERP_SOURCE_MISSING.label] : known;
}

/** Ret kalıcıdır; tam ret de reddedilmiş ERP güncellemesi de 'Reddedilenler' altında listelenir. */
function isRejectedStatus(status: number): boolean {
  return status === DRAFT_REJECTED || status === DRAFT_UPDATE_DISMISSED;
}

interface DraftValueCellProps {
  isMissing: boolean;
  value: string;
}

/** ERP'de eksik gelen ölçü, gerçek 0 değeriymiş gibi gösterilmez. */
function DraftValueCell({ isMissing, value }: DraftValueCellProps) {
  if (isMissing) {
    return (
      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">ERP’de eksik</span>
    );
  }
  return <span className="text-xs text-foreground">{value}</span>;
}
/** Bağlantı varken sekmeye göre boş durum başlığı; hepsi aynı dili konuşur. */
const EMPTY_TAB_TITLE: Record<number, string> = {
  [DRAFT_PENDING]: 'Bekleyen ERP ürünü yok.',
  [DRAFT_APPROVED]: 'Aktarılmış ERP ürünü yok.',
  [DRAFT_UPDATE_PENDING]: 'Güncellenmeyi bekleyen ERP ürünü yok.',
  [DRAFT_REJECTED]: 'Reddedilmiş ERP ürünü yok.',
};

const HEADER_ROW_H = 36;
const BELOW_TABLE_H = 80;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COLS = 10;

function ERPItemsTableSkeleton() {
  return (
    <Table className="min-w-[1100px] table-fixed">
      <TableHeader>
        <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
          {Array.from({ length: SKELETON_COLS }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-3 w-16" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            {Array.from({ length: SKELETON_COLS }).map((_, j) => (
              <TableCell key={j} className="py-0 px-3">
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── ERPItemsTable ─────────────────────────────────────────────────────────────

export function ERPItemsTable() {
  const { data: connection } = useERPConnection();
  const { data: erpSettings } = useERPSettings();
  const integrationId = connection?.id;
  const missingSyncRequirements = collectMissingSyncRequirements(connection, erpSettings);
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);

  const tableCardRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() =>
    Math.max(5, Math.floor((window.innerHeight - 400) / ROW_H)),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<EditableRow[]>([]);
  const [importDraftIds, setImportDraftIds] = useState<Record<string, string>>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [typeFilters, setTypeFilters] = useState<Set<TypeFilterKey>>(new Set());
  const [statusFilter, setStatusFilter] = useState<number>(DRAFT_PENDING);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [importMode, setImportMode] = useState<'import' | 'update'>('import');
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  useEffect(() => {
    let last = pageSize;
    const calculate = () => {
      if (!tableCardRef.current) return;
      const top = tableCardRef.current.getBoundingClientRect().top;
      const available = window.innerHeight - top - BELOW_TABLE_H - HEADER_ROW_H;
      const next = Math.max(5, Math.floor(available / ROW_H));
      if (next !== last) {
        last = next;
        setPageSize(next);
        setPage(1);
      }
    };
    calculate();
    const rafId = requestAnimationFrame(calculate);
    window.addEventListener('resize', calculate);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', calculate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showFilterPanel) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilterPanel]);

  const isRejectedTab = statusFilter === DRAFT_REJECTED;
  const isUpdateTab = statusFilter === DRAFT_UPDATE_PENDING;
  const isSelectableTab = statusFilter === DRAFT_PENDING || isUpdateTab;

  const isSearching = searchTerm.trim().length > 0;
  const hasActiveFilters = typeFilters.size > 0;
  // Arama ve tip filtresi sunucuda uygulanir; istemcide filtrelemek yalnizca acik
  // sayfayi kapsar ve "Toplam" sayacini filtreden habersiz birakirdi.
  const debouncedSearch = useDebounce(searchTerm.trim());
  const selectedCategories = Array.from(typeFilters)
    .map((key) => CATEGORY_BY_FILTER_KEY.get(key))
    .filter((category): category is number => category !== undefined);

  const {
    data: draftPage,
    isLoading,
    isFetching,
    isError: isDraftError,
    error: draftError,
    refetch: refetchDrafts,
  } = useDraftItems({
    page,
    pageSize,
    status: statusFilter,
    search: debouncedSearch || undefined,
    categories: selectedCategories,
  });

  const pageItemIds = new Set((draftPage?.items ?? []).map((i) => i.id));
  // Seçim sayfa değişince korunur; bu yüzden seçili kayıtların bir kısmı açık sayfada
  // olmayabilir. Aktarıma giden satırlar kayıt nesnesini gerektirdiğinden, o durumda
  // tüm seçilebilir kümenin de çekilmesi gerekir.
  const hasOffPageSelection = Array.from(selectedIds).some((id) => !pageItemIds.has(id));

  // Tümünü-seç kümesi aktif sekmeye ve açık filtreye bağlıdır; aksi halde ekranda
  // görünmeyen kayıtlar toplu işleme girer.
  const { data: allSelectablePage } = useDraftItems(
    {
      page: 1,
      pageSize: 9999,
      status: statusFilter,
      search: debouncedSearch || undefined,
      categories: selectedCategories,
    },
    { enabled: isSelectableTab && (selectAllMode || hasOffPageSelection) },
  );

  // Reddedilenler sekmesi rozeti; kayitlarin kaybolmadigini sekme uzerinden gorunur kilar.
  const { data: rejectedCountPage } = useDraftItems({
    page: 1,
    pageSize: 1,
    status: DRAFT_REJECTED,
  });

  const effectiveSelectedIds: ReadonlySet<string> =
    selectAllMode && allSelectablePage
      ? new Set(allSelectablePage.items.map((i) => i.id))
      : selectedIds;

  // Kimlikten kayda çözüm tablosu: açık sayfa ile seçilebilir kümenin birleşimi.
  // Açık sayfa sonra yazılır ki en taze kopya kazansın.
  const knownItemsById = new Map<string, DraftItem>();
  for (const item of allSelectablePage?.items ?? []) knownItemsById.set(item.id, item);
  for (const item of draftPage?.items ?? []) knownItemsById.set(item.id, item);

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerERPSync();
  const bulkReject = useBulkRejectDraftItems();
  const reinstate = useReinstateDraftItems();

  const columnCount = isRejectedTab ? 10 : 9;

  const allItems = draftPage?.items ?? [];

  // Tip ERP grup kodundan çözülen kategoriden okunur; kategorisi bilinmeyenler '?' seçeneğinde toplanır.
  const uniqueTypes = toTypeOptions(draftPage?.availableCategories ?? []);

  // Eleme sunucuda bittiği için sayfa doğrudan gösterilir; toplam da filtreli sayıdır.
  const totalCount = draftPage?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedItems = allItems;

  const showSkeleton = (isLoading || isFetching) && !isDraftError;
  const hasNarrowedView = isSearching || hasActiveFilters;
  const isEmpty = !showSkeleton && !isDraftError && displayedItems.length === 0 && !hasNarrowedView;
  const noResults =
    !showSkeleton && !isDraftError && displayedItems.length === 0 && hasNarrowedView;

  const selectableItems = displayedItems.filter((i) =>
    isUpdateTab ? i.status === DRAFT_UPDATE_PENDING : i.status === DRAFT_PENDING,
  );
  const allSelected =
    selectAllMode ||
    (selectableItems.length > 0 && selectableItems.every((i) => effectiveSelectedIds.has(i.id)));
  const someSelected = !allSelected && effectiveSelectedIds.size > 0;

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  function handleSelectAll(checked: boolean | 'indeterminate') {
    if (checked === true) {
      setSelectAllMode(true);
    } else {
      setSelectAllMode(false);
      setSelectedIds(new Set());
    }
  }

  function handleSelectRow(id: string, checked: boolean) {
    if (selectAllMode && allSelectablePage) {
      const materialized = new Set(allSelectablePage.items.map((i) => i.id));
      if (!checked) materialized.delete(id);
      setSelectAllMode(false);
      setSelectedIds(materialized);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Kilitli aksiyon sessizce başarısız olmaz; eksik ayar diyalogla tamamlatılır.
  function handleSync() {
    if (!integrationId || missingSyncRequirements.length > 0) {
      setRequirementsOpen(true);
      return;
    }
    triggerSync({ integrationId });
  }

  function handleOpenImport() {
    // Seçim açık sayfayla sınırlı değildir; satırlar tüm bilinen kayıtlardan çözülür,
    // aksi halde yalnızca o an ekranda duran kadarı aktarım ekranına giderdi.
    const selected = Array.from(effectiveSelectedIds)
      .map((id) => knownItemsById.get(id))
      .filter((item): item is DraftItem => item !== undefined);
    const rows = selected.map(draftItemToRow);
    const draftIds: Record<string, string> = {};
    rows.forEach((row, i) => {
      draftIds[row._id] = selected[i].id;
    });
    setImportRows(rows);
    setImportDraftIds(draftIds);
    setImportMode(isUpdateTab ? 'update' : 'import');
    setImportOpen(true);
  }

  // Toplu ret teyitsiz calismaz; kullanici kac kaydin ne olacagini gorur.
  function handleConfirmReject() {
    setRejectConfirmOpen(false);
    bulkReject.mutate(Array.from(effectiveSelectedIds), {
      onSuccess: () => {
        setSelectedIds(new Set());
        setSelectAllMode(false);
      },
    });
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Durum filtreleri */}
        <FilterTabs
          tabs={[
            { value: String(DRAFT_PENDING), label: 'Bekleyenler' },
            { value: String(DRAFT_APPROVED), label: 'Aktarılanlar' },
            { value: String(DRAFT_UPDATE_PENDING), label: 'Güncellemeler' },
            {
              value: String(DRAFT_REJECTED),
              label: 'Reddedilenler',
              count: rejectedCountPage?.totalCount,
            },
          ]}
          value={String(statusFilter)}
          onChange={(v) => {
            setStatusFilter(Number(v));
            setPage(1);
            setSelectedIds(new Set());
            setSelectAllMode(false);
          }}
        />

        <SearchInput
          size="sm"
          onSearch={handleSearch}
          placeholder="Ürün adı, SKU, ERP ID veya barkod ile ara..."
        />

        {/* Filtrele */}
        <div ref={filterRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-xs',
              hasActiveFilters && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtrele
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {typeFilters.size}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tip
                </p>
                <div className="space-y-2">
                  {uniqueTypes.map((type) => (
                    <label
                      key={type}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={typeFilters.has(type)}
                        onCheckedChange={() => {
                          setTypeFilters((prev) => {
                            const next = new Set(prev);
                            if (next.has(type)) next.delete(type);
                            else next.add(type);
                            return next;
                          });
                          setPage(1);
                        }}
                      />
                      {type === ERP_SOURCE_MISSING.label ? (
                        <span
                          className="text-xs text-muted-foreground"
                          title={ERP_SOURCE_MISSING.hint}
                        >
                          {ERP_SOURCE_MISSING.label}
                        </span>
                      ) : (
                        <ProductTypeCell productType={type} />
                      )}
                    </label>
                  ))}
                </div>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="mt-3 h-auto p-0 text-[11px] text-muted-foreground"
                    onClick={() => {
                      setTypeFilters(new Set());
                      setPage(1);
                    }}
                  >
                    Filtreleri temizle
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isSyncing ? ERP_TERM.syncRunning : ERP_TERM.sync}
        </Button>
      </div>

      {/* No-results alert */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun ERP ürünü bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div
        ref={tableCardRef}
        className="overflow-x-auto overflow-hidden rounded-2xl border border-border bg-background"
      >
        {isDraftError ? (
          <QueryErrorState
            error={draftError}
            title="Taslak ürünler yüklenemedi"
            fallbackMessage="ERP taslakları alınamadı. Bu bir bağlantı veya sunucu hatası; taslak olmadığı anlamına gelmez."
            onRetry={() => void refetchDrafts()}
            className="m-4 w-auto"
          />
        ) : showSkeleton ? (
          <ERPItemsTableSkeleton />
        ) : (
          <Table className="min-w-[1100px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 py-0 px-3">
                  {isSelectableTab && (
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Tümünü seç"
                    />
                  )}
                </TableHead>
                <TableHead className="w-52 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  Ürün
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  Tip
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  SKU
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  Barkod
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  {DIMENSION_LABEL.width}
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  {DIMENSION_LABEL.height}
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  {DIMENSION_LABEL.length}
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                  Ağırlık
                </TableHead>
                {isRejectedTab && (
                  <TableHead className="w-40 whitespace-nowrap py-0 px-3 text-[11px] font-semibold uppercase tracking-wide">
                    İşlem
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columnCount} className="p-4">
                    {!integrationId ? (
                      <EmptyState
                        icon={PlugZap}
                        title="Henüz ERP bağlantınız yok"
                        description={
                          <span className="block">
                            Üç adımda tamamlanır: 1) Bağlan · 2) {ERP_TERM.sync} · 3){' '}
                            {ERP_TERM.approve}
                          </span>
                        }
                        className="border-0"
                      >
                        <Button asChild size="sm">
                          <Link to={ERP_SETTINGS_ROUTE.connection}>{ERP_TERM.connect}</Link>
                        </Button>
                      </EmptyState>
                    ) : (
                      <EmptyState
                        icon={PackageSearch}
                        title={EMPTY_TAB_TITLE[statusFilter] ?? 'Bekleyen ERP ürünü yok.'}
                        description={
                          statusFilter === DRAFT_PENDING
                            ? "Son çekimden bu yana yeni ürün gelmemiş olabilir; ERP'den yeniden çekebilirsiniz."
                            : undefined
                        }
                        className="border-0"
                      >
                        {statusFilter === DRAFT_PENDING && (
                          <Button size="sm" onClick={handleSync} disabled={isSyncing}>
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                            {ERP_TERM.sync}
                          </Button>
                        )}
                      </EmptyState>
                    )}
                  </TableCell>
                </TableRow>
              )}
              {displayedItems.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'h-12',
                    row.status === DRAFT_APPROVED && 'bg-emerald-50/40 dark:bg-emerald-950/20',
                    row.status === DRAFT_UPDATE_PENDING && 'bg-amber-50/60 dark:bg-amber-950/20',
                    isRejectedStatus(row.status) && 'opacity-60',
                  )}
                >
                  <TableCell className="py-0 px-3">
                    {row.status === DRAFT_PENDING ? (
                      <Checkbox
                        checked={effectiveSelectedIds.has(row.id)}
                        onCheckedChange={(checked) => handleSelectRow(row.id, Boolean(checked))}
                        aria-label={`${row.name} satırını seç`}
                      />
                    ) : row.status === DRAFT_APPROVED ? (
                      <Checkbox
                        checked
                        aria-label="Aktarıldı"
                        className="pointer-events-none data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    ) : row.status === DRAFT_UPDATE_PENDING ? (
                      <Checkbox
                        checked={effectiveSelectedIds.has(row.id)}
                        onCheckedChange={(checked) => handleSelectRow(row.id, Boolean(checked))}
                        aria-label={`${row.name} güncelleme seç`}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    ) : isRejectedStatus(row.status) ? (
                      <XCircle
                        className="h-4 w-4 text-destructive/60"
                        aria-label={
                          row.status === DRAFT_UPDATE_DISMISSED
                            ? 'Güncellemesi reddedildi'
                            : 'Reddedildi'
                        }
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-0 px-3 max-w-[176px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ErpProviderMark systemName={row.integrationSystemName} />
                      <span className="block truncate text-xs text-foreground" title={row.name}>
                        {row.name}
                      </span>
                      {row.missingFields.length > 0 && (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-amber-500/60 px-1.5 text-[10px] text-amber-700 dark:text-amber-400"
                          title={`ERP'de eksik: ${row.missingFields
                            .map((field) => MISSING_FIELD_LABEL[field] ?? field)
                            .join(', ')}`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Eksik alan
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    {hasKnownCategory(row) ? (
                      <ProductTypeCell productType={draftProductType(row.category)} />
                    ) : (
                      <span
                        className="text-xs text-muted-foreground"
                        title={ERP_SOURCE_MISSING.hint}
                      >
                        {ERP_SOURCE_MISSING.label}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.sku ?? row.erpId ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.barcode ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <DraftValueCell
                      isMissing={row.missingFields.includes(DRAFT_FIELD.Width)}
                      value={formatDimensionDisplay(row.width, dimensionUnit)}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <DraftValueCell
                      isMissing={row.missingFields.includes(DRAFT_FIELD.Height)}
                      value={formatDimensionDisplay(row.height, dimensionUnit)}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <DraftValueCell
                      isMissing={row.missingFields.includes(DRAFT_FIELD.Length)}
                      value={formatDimensionDisplay(row.length, dimensionUnit)}
                    />
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <DraftValueCell
                      isMissing={row.missingFields.includes(DRAFT_FIELD.Weight)}
                      value={formatWeightDisplay(row.weight, weightUnit)}
                    />
                  </TableCell>
                  {isRejectedTab && (
                    <TableCell className="py-0 px-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={reinstate.isPending}
                        onClick={() => reinstate.mutate([row.id])}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Tekrar beklemeye al
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Toplam <span className="font-medium text-foreground">{totalCount}</span> ERP ürünü
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Önceki sayfa"
                disabled={page <= 1 || showSkeleton}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{page}</span>
                {' / '}
                <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label="Sonraki sayfa"
                disabled={page >= totalPages || showSkeleton}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Floating action bar — ProductForm ile aynı pattern */}
      <div
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out',
          effectiveSelectedIds.size > 0
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectAllMode(false);
              setSelectedIds(new Set());
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            {ERP_TERM.clearSelection}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-1.5"
            onClick={() => setRejectConfirmOpen(true)}
            disabled={bulkReject.isPending}
          >
            Reddet
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
              {effectiveSelectedIds.size}
            </span>
          </Button>
          <Button type="button" className="gap-1.5" onClick={handleOpenImport}>
            {isUpdateTab ? (
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {isUpdateTab ? 'Onayla' : ERP_TERM.approve}
            <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
              {effectiveSelectedIds.size}
            </span>
          </Button>
        </div>
      </div>

      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {effectiveSelectedIds.size} ürünü reddetmek üzeresiniz
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isUpdateTab
                ? "ERP'den gelen güncelleme uygulanmayacak; ürünler mevcut haliyle kalacak. Kayıtlar Reddedilenler sekmesinde durur, buradan tekrar beklemeye alabilirsiniz."
                : 'Bu ürünler Ürünler listesine aktarılmayacak. Kayıtlar silinmez; Reddedilenler sekmesinde durur ve tekrar beklemeye alabilirsiniz.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleConfirmReject}
              disabled={bulkReject.isPending}
            >
              Reddet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ErpSyncRequirementsDialog
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        missing={missingSyncRequirements}
      />

      {/* Transfer modal */}
      <BulkImportDialog
        key={importOpen ? importRows.map((r) => r._id).join(',') : 'closed'}
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setSelectAllMode(false);
            setSelectedIds(new Set());
          }
        }}
        initialRows={importRows}
        draftItemIds={importDraftIds}
        mode={importMode}
      />
    </div>
  );
}
