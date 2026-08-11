import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FilterTabs } from '@/components/shared/FilterTabs';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useERPConnection, useTriggerERPSync } from '@/lib/api/useERPIntegration';
import {
  useDraftItems,
  useBulkRejectDraftItems,
  DRAFT_PENDING,
  DRAFT_APPROVED,
  DRAFT_REJECTED,
  DRAFT_UPDATE_PENDING,
} from '@/lib/api/useDraftItems';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay } from '@/lib/utils/format/unitConversion';
import { draftItemToRow } from '@/features/data-management/imports/utils/draftItemToRow';
import { BulkImportDialog, type EditableRow } from './BulkImportDialog';
import { SearchInput } from '@/components/shared/SearchInput';
import { QueryErrorState } from '@/components/shared/QueryErrorState';

const ROW_H = 48;
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
  const integrationId = connection?.id;
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);

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
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<number>(DRAFT_PENDING);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [importMode, setImportMode] = useState<'import' | 'update'>('import');

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

  const isSearching = searchTerm.trim().length > 0;
  const hasActiveFilters = categoryFilters.size > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : pageSize;

  const {
    data: draftPage,
    isLoading,
    isFetching,
    isError: isDraftError,
    error: draftError,
    refetch: refetchDrafts,
  } = useDraftItems({ page: queryPage, pageSize: queryPageSize, status: statusFilter });

  const { data: allPendingPage } = useDraftItems(
    { page: 1, pageSize: 9999, status: DRAFT_PENDING },
    { enabled: selectAllMode },
  );

  const effectiveSelectedIds: ReadonlySet<string> =
    selectAllMode && allPendingPage ? new Set(allPendingPage.items.map((i) => i.id)) : selectedIds;

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerERPSync();
  const bulkReject = useBulkRejectDraftItems();

  const allItems = draftPage?.items ?? [];

  const uniqueCategories = Array.from(
    new Set(allItems.map((i) => i.productType).filter((c): c is string => Boolean(c))),
  ).sort();

  const filteredItems = allItems.filter((item) => {
    if (hasActiveFilters && !categoryFilters.has(item.productType ?? '')) return false;
    if (!isSearching) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.sku ?? '').toLowerCase().includes(q) ||
      (item.erpId ?? '').toLowerCase().includes(q) ||
      (item.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const totalCount = isSearching ? filteredItems.length : (draftPage?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayedItems = isSearching
    ? filteredItems.slice((page - 1) * pageSize, page * pageSize)
    : filteredItems;

  const showSkeleton = (isLoading || isFetching) && !isDraftError;
  const isEmpty = !showSkeleton && !isDraftError && displayedItems.length === 0 && !isSearching;
  const noResults = !showSkeleton && !isDraftError && displayedItems.length === 0 && isSearching;

  const selectableItems = filteredItems.filter((i) =>
    statusFilter === DRAFT_UPDATE_PENDING
      ? i.status === DRAFT_UPDATE_PENDING
      : i.status === DRAFT_PENDING,
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
    if (selectAllMode && allPendingPage) {
      const materialized = new Set(allPendingPage.items.map((i) => i.id));
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

  function handleSync() {
    if (!integrationId) return;
    triggerSync({ integrationId });
  }

  function handleOpenImport() {
    const selected = filteredItems.filter((item) => effectiveSelectedIds.has(item.id));
    const rows = selected.map(draftItemToRow);
    const draftIds: Record<string, string> = {};
    rows.forEach((row, i) => {
      draftIds[row._id] = selected[i].id;
    });
    setImportRows(rows);
    setImportDraftIds(draftIds);
    setImportMode(statusFilter === DRAFT_UPDATE_PENDING ? 'update' : 'import');
    setImportOpen(true);
  }

  function handleRejectSelected() {
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
                {categoryFilters.size}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kategori
                </p>
                <div className="space-y-2">
                  {uniqueCategories.map((cat) => (
                    <label
                      key={cat}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={categoryFilters.has(cat)}
                        onCheckedChange={() => {
                          setCategoryFilters((prev) => {
                            const next = new Set(prev);
                            if (next.has(cat)) next.delete(cat);
                            else next.add(cat);
                            return next;
                          });
                          setPage(1);
                        }}
                      />
                      <span className="text-xs">{cat}</span>
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
                      setCategoryFilters(new Set());
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
          disabled={isSyncing || !integrationId}
        >
          {isSyncing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          ERP ile Sync
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
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </TableHead>
                <TableHead className="w-52 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ürün
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Kategori
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Barkod
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Uzunluk/Çap (X)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Yükseklik (Y)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Derinlik (Z)
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={9}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {!integrationId
                      ? 'ERP bağlantısı yapılandırılmamış.'
                      : statusFilter === DRAFT_UPDATE_PENDING
                        ? 'Güncellenmeyi bekleyen ERP ürünü yok.'
                        : statusFilter === DRAFT_APPROVED
                          ? 'Aktarılmış ERP ürünü yok.'
                          : 'Bekleyen ERP ürünü yok.'}
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
                    row.status === DRAFT_REJECTED && 'opacity-50',
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
                    ) : row.status === DRAFT_REJECTED ? (
                      <XCircle className="h-4 w-4 text-destructive/60" aria-label="Reddedildi" />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-0 px-3 max-w-[176px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {row.integrationSystemName?.toLowerCase().includes('logo') && (
                        <img
                          src="/icons/erp-logo.png"
                          alt="Logo"
                          className="h-6 w-auto shrink-0 object-contain"
                        />
                      )}
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={row.name}
                      >
                        {row.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-0 px-3 text-xs text-muted-foreground">
                    {row.productType ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.sku ?? row.erpId ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3 font-mono text-xs text-muted-foreground">
                    {row.barcode ?? '—'}
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <span className="text-xs text-foreground">
                      {formatDimensionDisplay(row.width, dimensionUnit)}
                    </span>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <span className="text-xs text-foreground">
                      {formatDimensionDisplay(row.height, dimensionUnit)}
                    </span>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <span className="text-xs text-foreground">
                      {formatDimensionDisplay(row.length, dimensionUnit)}
                    </span>
                  </TableCell>
                  <TableCell className="py-0 px-3">
                    <span className="text-xs text-foreground">{row.weight} kg</span>
                  </TableCell>
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
            İptal Et
          </Button>
          {statusFilter === DRAFT_UPDATE_PENDING ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={handleRejectSelected}
                disabled={bulkReject.isPending}
              >
                Reddet
                <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                  {effectiveSelectedIds.size}
                </span>
              </Button>
              <Button type="button" className="gap-1.5" onClick={handleOpenImport}>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Onayla
                <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {effectiveSelectedIds.size}
                </span>
              </Button>
            </>
          ) : (
            <Button type="button" className="gap-1.5" onClick={handleOpenImport}>
              <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
              Ürünlere Aktar
              <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
                {effectiveSelectedIds.size}
              </span>
            </Button>
          )}
        </div>
      </div>

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
