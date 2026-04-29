import { useCallback, useState } from 'react';
import { ChevronDown, Download, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { Item } from '@/lib/types/item';
import {
  calcVolume,
  formatDimension,
  formatVolume,
  type DimensionUnit,
} from '@/lib/utils/calcVolume';
import { ConstraintIcons } from './ConstraintIcons';
import { SearchInput } from './SearchInput';

// ─── Text highlight (AC3) ─────────────────────────────────────────────────────

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

const SKELETON_COL_WIDTHS = ['w-44', 'w-24', 'w-52', 'w-24', 'w-20', 'w-20', 'w-28', 'w-20'];

function ProductTableSkeleton() {
  return (
    <Table className="min-w-[860px]">
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
          <TableRow key={i} className="hover:bg-transparent">
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-14" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-12" />
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
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
  unit: DimensionUnit;
  searchTerm: string;
  onEdit?: (item: Item) => void;
  onDelete?: (item: Item) => void;
}

function ProductRow({ item, unit, searchTerm, onEdit, onDelete }: ProductRowProps) {
  const volume = calcVolume(item.length, item.width, item.height);
  const dimStr = [
    formatDimension(item.length, unit),
    formatDimension(item.width, unit),
    formatDimension(item.height, unit),
  ].join(' × ');

  return (
    <TableRow>
      {/* Ürün adı — highlight (AC3) */}
      <TableCell className="max-w-[176px]">
        <span className="block truncate text-sm text-muted-foreground" title={item.name}>
          <HighlightText text={item.name} query={searchTerm} />
        </span>
      </TableCell>

      {/* SKU — highlight (AC3) */}
      <TableCell>
        <span className="font-mono text-xs text-muted-foreground">
          <HighlightText text={item.sku} query={searchTerm} />
        </span>
      </TableCell>

      {/* Boyutlar L × G × Y + unit badge (AC4) */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-foreground">{dimStr}</span>
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {unit}
          </Badge>
        </div>
      </TableCell>

      {/* Hacim — auto-calculated, updates with unit (AC2) */}
      <TableCell>
        <span className="text-xs font-medium text-foreground">{formatVolume(volume, unit)}</span>
      </TableCell>

      {/* Ağırlık */}
      <TableCell>
        <span className="text-xs text-foreground">{item.weight} kg</span>
      </TableCell>

      {/* Maks. istif */}
      <TableCell>
        <span className="text-xs text-foreground">{item.maxStackCount} kat</span>
      </TableCell>

      {/* Kısıtlar (AC1) */}
      <TableCell>
        <ConstraintIcons
          fragility={item.fragility}
          isStackable={item.isStackable}
          allowRotateX={item.allowRotateX}
          allowRotateY={item.allowRotateY}
          allowRotateZ={item.allowRotateZ}
        />
      </TableCell>

      {/* İşlemler — far right, after constraints (AC5) */}
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="Düzenle"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit?.(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sil"
            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-destructive"
            onClick={() => onDelete?.(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── ProductTable ─────────────────────────────────────────────────────────────

interface ProductTableProps {
  onEdit?: (item: Item) => void;
  onCreateClick?: () => void;
}

type CategoryFilter = 'all' | 'koli' | 'varil';

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'koli', label: 'Koli' },
  { value: 'varil', label: 'Varil' },
];

export function ProductTable({ onEdit, onCreateClick }: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const unit: DimensionUnit = 'cm';

  const handleSearch = useCallback((term: string) => setSearchTerm(term), []);
  const deleteItem = useDeleteItem();

  const {
    data: items,
    isLoading,
    isFetching,
  } = useItems(searchTerm ? { search: searchTerm } : undefined);

  const handleDelete = useCallback(
    (item: Item) => {
      if (!window.confirm(`"${item.name}" ürününü silmek istediğinizden emin misiniz?`)) return;
      deleteItem.mutate(item.id);
    },
    [deleteItem],
  );

  const showSkeleton = isLoading || isFetching;
  const isEmpty = !showSkeleton && items?.length === 0 && !searchTerm;
  const noResults = !showSkeleton && items?.length === 0 && Boolean(searchTerm);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Category tabs */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                category === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <SearchInput onSearch={handleSearch} placeholder="SKU kodu veya ürün adı ile ara..." />

        {/* Filtrele */}
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtrele
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>

        {/* Dışa Aktar */}
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Dışa Aktar
        </Button>

        {/* Toplu Ürün Ekle */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={onCreateClick}
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Toplu Ürün Ekle
        </Button>

        {/* Yeni Ürün Ekle */}
        <Button size="sm" className="shrink-0 gap-1.5 text-xs" onClick={onCreateClick}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Yeni Ürün Ekle
        </Button>
      </div>

      {/* No-results alert (AC5) */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun ürün bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {showSkeleton ? (
          <ProductTableSkeleton />
        ) : (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-44 text-[10px] font-semibold uppercase tracking-widest">
                  Ürün
                </TableHead>
                <TableHead className="w-24 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </TableHead>
                <TableHead className="w-52 text-[10px] font-semibold uppercase tracking-widest">
                  Boyutlar (L × G × Y)
                </TableHead>
                <TableHead className="w-24 text-[10px] font-semibold uppercase tracking-widest">
                  Hacim
                </TableHead>
                <TableHead className="w-20 text-[10px] font-semibold uppercase tracking-widest">
                  Ağırlık
                </TableHead>
                <TableHead className="w-20 text-[10px] font-semibold uppercase tracking-widest">
                  Maks. İstif
                </TableHead>
                <TableHead className="w-32 text-[10px] font-semibold uppercase tracking-widest">
                  Kısıtlar
                </TableHead>
                <TableHead className="w-20 text-[10px] font-semibold uppercase tracking-widest">
                  İşlem
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={8}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    Henüz ürün eklenmemiş.
                  </TableCell>
                </TableRow>
              )}
              {items?.map((item) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  unit={unit}
                  searchTerm={searchTerm}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
