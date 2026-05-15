import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cylinder,
  Download,
  Droplets,
  Flame,
  FlaskConical,
  Layers,
  Leaf,
  Package,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  Utensils,
  Wind,
  Wine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useDeleteItem, useItems } from '@/lib/api/useItems';
import { useUnitStore } from '@/lib/store/useUnitStore';
import type { Item } from '@/lib/types/item';
import { calcVolume } from '@/lib/utils/calcVolume';
import { formatDimensionDisplay, formatVolumeDisplay } from '@/lib/utils/unitConversion';
import { exportItemsToExcel } from '@/lib/utils/export-utils';
import { BulkImportDialog } from './BulkImportDialog';
import { ConstraintIcons } from './ConstraintIcons';
import { SearchInput } from './SearchInput';

const PRODUCT_TYPE_ICON = {
  koli: { Icon: Box, label: 'Koli' },
  varil: { Icon: Cylinder, label: 'Varil' },
  palet: { Icon: Package, label: 'Palet' },
} as const;

// ─── Constraint filter types ──────────────────────────────────────────────────

type ConstraintFilter =
  | 'fragile'
  | 'liquid'
  | 'corrosive'
  | 'odor'
  | 'food'
  | 'dry'
  | 'chemical'
  | 'organic'
  | 'stackable'
  | 'rotationLocked';

const FRAGILITY_FILTER_VALUE: Partial<Record<ConstraintFilter, number>> = {
  fragile: 1,
  liquid: 2,
  corrosive: 5,
  odor: 6,
  food: 7,
  dry: 8,
  chemical: 9,
  organic: 10,
};

import type { LucideIcon } from 'lucide-react';

const CONSTRAINT_FILTER_OPTIONS: {
  value: ConstraintFilter;
  label: string;
  Icon: LucideIcon;
  className: string;
}[] = [
  { value: 'fragile', label: 'Kırılgan', Icon: Wine, className: 'text-amber-600' },
  { value: 'liquid', label: 'Sıvı İçerir', Icon: Droplets, className: 'text-blue-600' },
  { value: 'corrosive', label: 'Aşındırıcı', Icon: Flame, className: 'text-orange-600' },
  { value: 'odor', label: 'Kokuya Hassas', Icon: Wind, className: 'text-green-600' },
  { value: 'food', label: 'Gıda Teması', Icon: Utensils, className: 'text-green-600' },
  { value: 'dry', label: 'Kuru', Icon: Sun, className: 'text-muted-foreground' },
  { value: 'chemical', label: 'Kimyasal', Icon: FlaskConical, className: 'text-purple-600' },
  { value: 'organic', label: 'Organik', Icon: Leaf, className: 'text-green-600' },
  { value: 'stackable', label: 'İstiflenebilir', Icon: Layers, className: 'text-muted-foreground' },
  {
    value: 'rotationLocked',
    label: 'Rotasyon Kısıtlı',
    Icon: RotateCcw,
    className: 'text-muted-foreground',
  },
];

function matchesConstraintFilter(item: Item, filter: ConstraintFilter): boolean {
  const fragilityVal = FRAGILITY_FILTER_VALUE[filter];
  if (fragilityVal !== undefined) return item.fragility === fragilityVal;
  if (filter === 'stackable') return item.isStackable;
  if (filter === 'rotationLocked')
    return !item.allowRotateX || !item.allowRotateY || !item.allowRotateZ;
  return false;
}

// ─── Text highlight ───────────────────────────────────────────────────────────

interface HighlightTextProps {
  text: string;
  query: string;
}

function HighlightText({ text, query }: HighlightTextProps) {
  const q = query.trim();
  if (!q) return <span>{text}</span>;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <span key={i} className="font-semibold text-foreground">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SKELETON_COL_WIDTHS = [
  'w-44',
  'w-16',
  'w-24',
  'w-16',
  'w-16',
  'w-16',
  'w-24',
  'w-20',
  'w-20',
  'w-28',
  'w-20',
];

function ProductTableSkeleton() {
  return (
    <Table className="min-w-[1000px] table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {SKELETON_COL_WIDTHS.map((w, i) => (
            <TableHead key={i}>
              <Skeleton className={cn('h-3', w)} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow key={i} className="h-12 hover:bg-transparent">
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-36" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-12" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-16" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-14" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <div className="flex gap-1">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-5 w-5 rounded-md" />
              </div>
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-6 w-6 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

interface ProductRowProps {
  item: Item;
  searchTerm: string;
  onRowClick?: (item: Item) => void;
  onDelete?: (item: Item) => void;
}

function ProductRow({ item, searchTerm, onRowClick, onDelete }: ProductRowProps) {
  const volume = calcVolume(item.length, item.width, item.height);
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const volumeUnit = useUnitStore((s) => s.volumeUnit);
  const { Icon: TypeIcon, label: typeLabel } = PRODUCT_TYPE_ICON[item.productType];

  const cell = 'py-0 px-3';

  return (
    <TableRow className="h-12 cursor-pointer" onClick={() => onRowClick?.(item)}>
      <TableCell className={cn(cell, 'max-w-[176px]')}>
        <span className="block truncate text-xs text-muted-foreground" title={item.name}>
          <HighlightText text={item.name} query={searchTerm} />
        </span>
      </TableCell>

      <TableCell className={cell}>
        <div className="flex items-center gap-1 text-muted-foreground">
          <TypeIcon className="h-3 w-3 shrink-0" strokeWidth={1.5} />
          <span className="text-xs">{typeLabel}</span>
        </div>
      </TableCell>

      <TableCell className={cn(cell, 'max-w-[96px]')}>
        <span className="block truncate font-mono text-xs text-muted-foreground" title={item.sku}>
          <HighlightText text={item.sku} query={searchTerm} />
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatDimensionDisplay(item.width, dimensionUnit)}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatDimensionDisplay(item.height, dimensionUnit)}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {item.productType === 'varil' ? '—' : formatDimensionDisplay(item.length, dimensionUnit)}
        </span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-foreground">{formatVolumeDisplay(volume, volumeUnit)}</span>
      </TableCell>

      <TableCell className={cell}>
        <span className="text-xs text-foreground">{item.weight} kg</span>
      </TableCell>

      <TableCell className={cell}>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-foreground">{item.maxStackCount} kat</span>
          {item.maxWeightOnTop != null && item.maxWeightOnTop > 0 && (
            <span className="text-[10px] text-muted-foreground">maks {item.maxWeightOnTop} kg</span>
          )}
        </div>
      </TableCell>

      <TableCell className={cell}>
        <ConstraintIcons
          fragility={item.fragility}
          isStackable={item.isStackable}
          allowRotateX={item.allowRotateX}
          allowRotateY={item.allowRotateY}
          allowRotateZ={item.allowRotateZ}
        />
      </TableCell>

      <TableCell className={cell}>
        <Button
          variant="ghost"
          size="icon"
          title="Sil"
          className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(item);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── ProductTable ─────────────────────────────────────────────────────────────

interface ProductTableProps {
  onRowClick?: (item: Item) => void;
  onCreateClick?: () => void;
}

type CategoryFilter = 'all' | 'koli' | 'varil' | 'palet';

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'koli', label: 'Koli' },
  { value: 'varil', label: 'Varil' },
  { value: 'palet', label: 'Palet' },
];

const CATEGORY_TO_PRODUCT_TYPE: Record<
  Exclude<CategoryFilter, 'all'>,
  'koli' | 'varil' | 'palet'
> = {
  koli: 'koli',
  varil: 'varil',
  palet: 'palet',
};

const ROW_H = 48;
const HEADER_ROW_H = 36;
const BELOW_TABLE_H = 80;

export function ProductTable({ onRowClick, onCreateClick }: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [constraintFilters, setConstraintFilters] = useState<Set<ConstraintFilter>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);

  const [pageSize, setPageSize] = useState(() =>
    Math.max(5, Math.floor((window.innerHeight - 400) / ROW_H)),
  );

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

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1);
  }, []);
  const deleteItem = useDeleteItem();

  const hasClientFilters = category !== 'all' || constraintFilters.size > 0;

  const {
    data: itemsPage,
    isLoading,
    isFetching,
  } = useItems({
    search: searchTerm || undefined,
    page: hasClientFilters ? 1 : page,
    pageSize: hasClientFilters ? 100 : pageSize,
  });

  const items = itemsPage?.items;

  // Close filter panel on outside click
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

  const handleDelete = useCallback(
    (item: Item) => {
      if (!window.confirm(`"${item.name}" ürününü silmek istediğinizden emin misiniz?`)) return;
      deleteItem.mutate(item.id);
    },
    [deleteItem],
  );

  function toggleConstraintFilter(value: ConstraintFilter) {
    setConstraintFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setPage(1);
  }

  const categoryFiltered =
    category === 'all'
      ? items
      : items?.filter((item) => item.productType === CATEGORY_TO_PRODUCT_TYPE[category]);

  const filteredItems =
    constraintFilters.size === 0
      ? categoryFiltered
      : categoryFiltered?.filter((item) =>
          [...constraintFilters].some((f) => matchesConstraintFilter(item, f)),
        );

  const totalCount = hasClientFilters ? (filteredItems?.length ?? 0) : (itemsPage?.totalCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const displayedItems = hasClientFilters
    ? filteredItems?.slice((page - 1) * pageSize, page * pageSize)
    : filteredItems;

  const showSkeleton = isLoading || isFetching;
  const isEmpty =
    !showSkeleton &&
    displayedItems?.length === 0 &&
    !searchTerm &&
    constraintFilters.size === 0 &&
    category === 'all';
  const noResults =
    !showSkeleton &&
    displayedItems?.length === 0 &&
    (Boolean(searchTerm) || constraintFilters.size > 0 || category !== 'all');
  const hasActiveFilters = constraintFilters.size > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategory(tab.value);
                setPage(1);
              }}
              className={cn(
                'h-auto rounded-md px-3 py-1 text-xs font-medium',
                category === tab.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search input */}
        <SearchInput onSearch={handleSearch} placeholder="SKU kodu veya ürün adı ile ara..." />

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
                {constraintFilters.size}
              </span>
            )}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kısıt Filtresi
                </p>
                <div className="space-y-2">
                  {CONSTRAINT_FILTER_OPTIONS.map(({ value, label, Icon, className }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={constraintFilters.has(value)}
                        onCheckedChange={() => toggleConstraintFilter(value)}
                      />
                      <Icon className={cn('h-3.5 w-3.5', className)} />
                      <span className="text-xs">{label}</span>
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
                      setConstraintFilters(new Set());
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

        {/* Dışa Aktar */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={() => exportItemsToExcel(filteredItems ?? [])}
          disabled={!filteredItems || filteredItems.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Dışa Aktar
        </Button>

        {/* İçe Aktar / Toplu Ürün Ekle */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={() => setShowBulkImport(true)}
        >
          <Upload className="h-3.5 w-3.5" />
          İçe Aktar
        </Button>

        {/* Yeni Ürün Ekle */}
        <Button size="sm" className="shrink-0 gap-1.5 text-xs" onClick={onCreateClick}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Yeni Ürün Ekle
        </Button>
      </div>

      {/* No-results alert */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun ürün bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table card */}
      <div
        ref={tableCardRef}
        className="overflow-x-auto overflow-hidden rounded-2xl border border-border bg-background"
      >
        {showSkeleton ? (
          <ProductTableSkeleton />
        ) : (
          <Table className="min-w-[1000px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-44 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ürün
                </TableHead>
                <TableHead className="w-20 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Tip
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Uzunluk/Çap
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Yükseklik
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Derinlik
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Hacim
                </TableHead>
                <TableHead className="w-20 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Katman Sayısı
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Kısıtlar
                </TableHead>
                <TableHead className="w-16 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  İşlem
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={11}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    Henüz ürün eklenmemiş.
                  </TableCell>
                </TableRow>
              )}
              {displayedItems?.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  searchTerm={searchTerm}
                  onRowClick={onRowClick}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Toplam <span className="font-medium text-foreground">{totalCount}</span> ürün
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

      <BulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} />
    </div>
  );
}
