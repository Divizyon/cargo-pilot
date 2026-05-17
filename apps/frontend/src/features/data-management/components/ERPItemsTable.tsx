import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
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
import { useDraftItems, type DraftItem } from '@/lib/api/useDraftItems';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay } from '@/lib/utils/unitConversion';
import { BulkImportDialog, type EditableRow } from './BulkImportDialog';
import { SearchInput } from './SearchInput';

const ROW_H = 48;
const HEADER_ROW_H = 36;
const BELOW_TABLE_H = 80;

const DRAFT_PENDING = 0;
const DRAFT_APPROVED = 1;
const DRAFT_REJECTED = 2;

// ─── ERP → BulkImportDialog row dönüşümü (cm → mm) ──────────────────────────

function draftItemToImportRow(item: DraftItem): EditableRow {
  let tip: string;
  if (item.category === 1) tip = 'palet';
  else if (item.category === 0) tip = 'koli';
  else tip = 'varil';

  let allowRotateX = false,
    allowRotateY = false,
    allowRotateZ = false;
  switch (item.allowedRotations) {
    case 0:
      allowRotateX = true;
      allowRotateY = true;
      allowRotateZ = true;
      break;
    case 1:
      allowRotateX = false;
      allowRotateY = true;
      allowRotateZ = false;
      break;
    case 3:
      allowRotateX = true;
      allowRotateY = false;
      allowRotateZ = true;
      break;
    case 4:
      allowRotateX = true;
      allowRotateY = false;
      allowRotateZ = false;
      break;
    case 5:
      allowRotateX = false;
      allowRotateY = false;
      allowRotateZ = true;
      break;
    case 6:
      allowRotateX = false;
      allowRotateY = true;
      allowRotateZ = false;
      break;
  }

  return {
    _id: crypto.randomUUID(),
    name: item.name,
    sku: item.sku ?? '',
    tip,
    width: String(item.width),
    height: String(item.height),
    length: String(item.length),
    weight: String(item.weight),
    fragility: String(item.fragilityType),
    isStackable: item.isStackable,
    maxStackCount: String(item.maxStackCount > 0 ? item.maxStackCount : 1),
    allowRotateX,
    allowRotateY,
    allowRotateZ,
    constraintIds: item.constraintIds ?? [],
    incompatibleGroups: [],
    notes: item.specialNotes ?? '',
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const SKELETON_COLS = 9;

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
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
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
  } = useDraftItems({ page: queryPage, pageSize: queryPageSize, status: statusFilter });

  const { mutate: triggerSync, isPending: isSyncing } = useTriggerERPSync();

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

  const showSkeleton = isLoading || isFetching;
  const isEmpty = !showSkeleton && displayedItems.length === 0 && !isSearching;
  const noResults = !showSkeleton && displayedItems.length === 0 && isSearching;

  const selectableItems = filteredItems.filter((i) => i.status === DRAFT_PENDING);
  const allSelected =
    selectableItems.length > 0 && selectableItems.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && selectableItems.some((i) => selectedIds.has(i.id));

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  function handleSelectAll(checked: boolean | 'indeterminate') {
    if (checked === true) {
      setSelectedIds(new Set(selectableItems.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectRow(id: string, checked: boolean) {
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
    const selected = filteredItems.filter((item) => selectedIds.has(item.id));
    const rows = selected.map(draftItemToImportRow);
    const draftIds: Record<string, string> = {};
    rows.forEach((row, i) => {
      draftIds[row._id] = selected[i].id;
    });
    setImportRows(rows);
    setImportDraftIds(draftIds);
    setImportOpen(true);
  }

  return (
    <div className="relative flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Durum filtreleri */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {([
            { value: DRAFT_PENDING, label: 'Bekleyenler' },
            { value: DRAFT_APPROVED, label: 'Aktarılanlar' },
          ] as const).map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={cn(
                'h-auto rounded-md px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchInput
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
        {showSkeleton ? (
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
                    row.status === DRAFT_REJECTED && 'opacity-50',
                  )}
                >
                  <TableCell className="py-0 px-3">
                    {row.status === DRAFT_PENDING ? (
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) => handleSelectRow(row.id, Boolean(checked))}
                        aria-label={`${row.name} satırını seç`}
                      />
                    ) : row.status === DRAFT_APPROVED ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Aktarıldı" />
                    ) : row.status === DRAFT_REJECTED ? (
                      <XCircle className="h-4 w-4 text-destructive/60" aria-label="Reddedildi" />
                    ) : null}
                  </TableCell>
                  <TableCell className="py-0 px-3 max-w-[176px]">
                    <span className="block truncate text-xs text-muted-foreground" title={row.name}>
                      {row.name}
                    </span>
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
          selectedIds.size > 0
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none',
        )}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-6 py-3 shadow-lg">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground"
          >
            İptal Et
          </Button>
          <Button type="button" className="gap-1.5" onClick={handleOpenImport}>
            <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
            Ürünlere Aktar
            <span className="ml-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold">
              {selectedIds.size}
            </span>
          </Button>
        </div>
      </div>

      {/* Transfer modal */}
      <BulkImportDialog
        key={importOpen ? importRows.map((r) => r._id).join(',') : 'closed'}
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setSelectedIds(new Set());
        }}
        initialRows={importRows}
        draftItemIds={importDraftIds}
      />
    </div>
  );
}
