import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  SlidersHorizontal,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';

const ROW_H = 48; // h-12
const HEADER_ROW_H = 36; // h-9
const BELOW_TABLE_H = 80; // pagination + gap + bottom padding
import { cn } from '@/lib/utils';
import { FilterTabs } from '@/components/shared/FilterTabs';
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
import { useVehicles, useToggleFavorite } from '@/lib/api/useVehicles';
import { useUnitStore } from '@/lib/store/useUnitStore';
import { formatDimensionDisplay, formatWeightDisplay } from '@/lib/utils/unitConversion';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';
import { exportVehiclesToExcel } from '@/lib/utils/exportVehiclesToExcel';
import { SearchInput } from '@/components/shared/SearchInput';
import { VehicleDeleteDialog } from './VehicleDeleteDialog';
import { VehicleBulkImportDialog } from './VehicleBulkImportDialog';

// ─── Type icons ───────────────────────────────────────────────────────────────

interface TirIconProps {
  className?: string;
}

function TirIcon({ className }: TirIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="5" width="6" height="11" rx="1" />
      <line x1="1" y1="9" x2="7" y2="9" />
      <rect x="7" y="3" width="16" height="13" rx="1" />
      <circle cx="4" cy="18.5" r="1.8" />
      <circle cx="14" cy="18.5" r="1.8" />
      <circle cx="19" cy="18.5" r="1.8" />
    </svg>
  );
}

interface KamyonIconProps {
  className?: string;
}

function KamyonIcon({ className }: KamyonIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="13" rx="1" />
      <line x1="9" y1="4" x2="9" y2="17" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
    </svg>
  );
}

interface RomorkIconProps {
  className?: string;
}

function RomorkIcon({ className }: RomorkIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="18" height="13" rx="1" />
      <line x1="19" y1="10" x2="23" y2="10" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="14" cy="19" r="1.8" />
    </svg>
  );
}

interface KonteynerIconProps {
  className?: string;
}

function KonteynerIcon({ className }: KonteynerIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="22" height="16" rx="1" />
      <line x1="7" y1="3" x2="7" y2="19" />
      <line x1="13" y1="3" x2="13" y2="19" />
      <line x1="19" y1="3" x2="19" y2="19" />
    </svg>
  );
}

const TYPE_CONFIG: Record<
  VehicleType,
  {
    Icon: ({ className }: { className?: string }) => ReactElement;
    label: string;
    iconClass: string;
    textClass: string;
  }
> = {
  Tir: { Icon: TirIcon, label: 'Tır', iconClass: 'text-blue-500', textClass: 'text-blue-600' },
  Kamyon: {
    Icon: KamyonIcon,
    label: 'Kamyon',
    iconClass: 'text-zinc-500',
    textClass: 'text-zinc-600',
  },
  Kamposet: {
    Icon: RomorkIcon,
    label: 'Römork',
    iconClass: 'text-orange-500',
    textClass: 'text-orange-600',
  },
  Konteyner: {
    Icon: KonteynerIcon,
    label: 'Konteyner',
    iconClass: 'text-teal-500',
    textClass: 'text-teal-600',
  },
};

// ─── Sort ─────────────────────────────────────────────────────────────────────

type VehicleSortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

const SORT_OPTIONS: { value: VehicleSortKey; label: string }[] = [
  { value: 'date_desc', label: 'En Yeni' },
  { value: 'date_asc', label: 'En Eski' },
  { value: 'name_asc', label: "A'dan Z'ye" },
  { value: 'name_desc', label: "Z'den A'ya" },
];

const SORT_TO_PARAMS: Record<VehicleSortKey, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
  date_desc: { sortBy: 'createdAt', sortOrder: 'desc' },
  date_asc: { sortBy: 'createdAt', sortOrder: 'asc' },
  name_asc: { sortBy: 'name', sortOrder: 'asc' },
  name_desc: { sortBy: 'name', sortOrder: 'desc' },
};

function applySortToVehicles(vehicles: Vehicle[], key: VehicleSortKey): Vehicle[] {
  if (key === 'name_asc') return [...vehicles].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  if (key === 'name_desc') return [...vehicles].sort((a, b) => b.name.localeCompare(a.name, 'tr'));
  return vehicles;
}

// ─── Door direction config ────────────────────────────────────────────────────

const DOOR_CONFIG: Record<string, { label: string }> = {
  rear: { label: 'Ön' },
  side: { label: 'Yan' },
  top: { label: 'Üst' },
  rearAndSide: { label: 'Ön + Yan' },
};

// ─── Category tabs ────────────────────────────────────────────────────────────

type CategoryFilter = 'all' | VehicleType;

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'Tir', label: 'Tır' },
  { value: 'Kamyon', label: 'Kamyon' },
  { value: 'Kamposet', label: 'Römork' },
  { value: 'Konteyner', label: 'Konteyner' },
];

// ─── Door direction filter ────────────────────────────────────────────────────

type DoorFilter = 'rear' | 'side' | 'top' | 'rearAndSide';

const DOOR_FILTER_OPTIONS: { value: DoorFilter; label: string }[] = [
  { value: 'rear', label: 'Ön Kapı' },
  { value: 'side', label: 'Yan Kapı' },
  { value: 'top', label: 'Üst Kapı' },
  { value: 'rearAndSide', label: 'Ön + Yan' },
];

// ─── Status filter ────────────────────────────────────────────────────────────

type StatusFilter = 'active' | 'draft' | 'taslak' | '';

const STATUS_FILTER_OPTIONS: { value: 'active' | 'draft' | 'taslak'; label: string }[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'taslak', label: 'Taslak' },
  { value: 'draft', label: 'Pasif' },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function VehicleTableSkeleton() {
  return (
    <Table className="min-w-[1000px] table-fixed">
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          {['w-40', 'w-24', 'w-24', 'w-20', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16'].map((w, i) => (
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
              <Skeleton className="h-3 w-32" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-16" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-3 w-20" />
            </TableCell>
            <TableCell className="py-0 px-3">
              <Skeleton className="h-5 w-12 rounded-full" />
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
              <Skeleton className="h-6 w-14 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Vehicle row ──────────────────────────────────────────────────────────────

interface VehicleRowProps {
  vehicle: Vehicle;
  onDelete: (v: Vehicle) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
}

function VehicleRow({ vehicle, onDelete, onToggleFavorite }: VehicleRowProps) {
  const navigate = useNavigate();
  const cfg = TYPE_CONFIG[vehicle.vehicleType];
  const door = DOOR_CONFIG[vehicle.doorDirection] ?? { label: vehicle.doorDirection };
  const dimensionUnit = useUnitStore((s) => s.dimensionUnit);
  const weightUnit = useUnitStore((s) => s.weightUnit);
  const cell = 'py-0 px-3';

  return (
    <TableRow
      className="h-12 cursor-pointer"
      onClick={() => navigate(`/vehicles/${vehicle.id}/edit`, { state: { vehicle } })}
    >
      {/* Araç */}
      <TableCell className={cn(cell, 'max-w-[180px]')}>
        <span className="block truncate text-xs text-muted-foreground" title={vehicle.name}>
          {vehicle.name}
        </span>
      </TableCell>

      {/* Tip */}
      <TableCell className={cell}>
        <div className="flex items-center gap-1 text-muted-foreground">
          <cfg.Icon className="h-3 w-3 shrink-0" />
          <span className="text-xs">{cfg.label}</span>
        </div>
      </TableCell>

      {/* Plaka */}
      <TableCell className={cell}>
        <span className="block truncate text-xs text-muted-foreground">{vehicle.plate ?? '—'}</span>
      </TableCell>

      {/* Uzunluk (X) */}
      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatDimensionDisplay(vehicle.length, dimensionUnit)}
        </span>
      </TableCell>

      {/* Yükseklik (Y) */}
      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatDimensionDisplay(vehicle.height, dimensionUnit)}
        </span>
      </TableCell>

      {/* Derinlik (Z) */}
      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatDimensionDisplay(vehicle.width, dimensionUnit)}
        </span>
      </TableCell>

      {/* Maks Yük */}
      <TableCell className={cell}>
        <span className="text-xs text-foreground">
          {formatWeightDisplay(vehicle.maxCargoWeight, weightUnit)}
        </span>
      </TableCell>

      {/* Kapı Yönü */}
      <TableCell className={cell}>
        <span className="text-xs text-muted-foreground">{door.label}</span>
      </TableCell>

      {/* Durum */}
      <TableCell className={cell}>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              vehicle.status === 'taslak'
                ? 'bg-zinc-400'
                : (vehicle.isActive ?? true)
                  ? 'bg-green-500'
                  : 'bg-zinc-400',
            )}
          />
          <span className="text-xs text-foreground">
            {vehicle.status === 'taslak'
              ? 'Taslak'
              : (vehicle.isActive ?? true)
                ? 'Aktif'
                : 'Pasif'}
          </span>
        </div>
      </TableCell>

      <TableCell className={cell} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={vehicle.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => onToggleFavorite(vehicle.id, !vehicle.isFavorite)}
          >
            <Star
              className={cn(
                'h-3.5 w-3.5',
                vehicle.isFavorite ? 'fill-foreground text-foreground' : '',
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sil"
            className="h-7 w-7 text-muted-foreground hover:bg-accent hover:text-destructive"
            onClick={() => onDelete(vehicle)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── VehicleTable ─────────────────────────────────────────────────────────────

interface VehicleTableProps {
  onCreateClick?: () => void;
}

export function VehicleTable({ onCreateClick }: VehicleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [doorFilters, setDoorFilters] = useState<Set<DoorFilter>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [sortKey, setSortKey] = useState<VehicleSortKey>('date_desc');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [page, setPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const tableCardRef = useRef<HTMLDivElement>(null);
  const { mutate: toggleFavorite } = useToggleFavorite();

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

  const { data, isLoading, isFetching } = useVehicles({
    search: searchTerm || undefined,
    vehicleType: category !== 'all' ? category : undefined,
    status: statusFilter || undefined,
    page,
    pageSize,
    ...SORT_TO_PARAMS[sortKey],
  });

  const vehicles = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  useEffect(() => {
    if (!showSortPanel) return;
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSortPanel]);

  function toggleDoorFilter(value: DoorFilter) {
    setDoorFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    setPage(1);
  }

  function toggleStatusFilter(value: 'active' | 'draft' | 'taslak') {
    setStatusFilter((prev) => (prev === value ? '' : value));
    setPage(1);
  }

  function clearFilters() {
    setDoorFilters(new Set());
    setStatusFilter('');
    setPage(1);
  }

  const doorFilteredVehicles =
    doorFilters.size === 0
      ? vehicles
      : vehicles.filter((v) => doorFilters.has(v.doorDirection as DoorFilter));

  const filteredVehicles = applySortToVehicles(doorFilteredVehicles, sortKey);

  const showSkeleton = isLoading || isFetching;
  const hasActiveFilters = doorFilters.size > 0 || statusFilter !== '';
  const isEmpty =
    !showSkeleton && filteredVehicles.length === 0 && !searchTerm && !hasActiveFilters;
  const noResults =
    !showSkeleton && filteredVehicles.length === 0 && (Boolean(searchTerm) || hasActiveFilters);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category tabs */}
        <FilterTabs
          tabs={CATEGORY_TABS}
          value={category}
          onChange={(v) => { setCategory(v as Parameters<typeof setCategory>[0]); setPage(1); }}
        />

        {/* Search */}
        <SearchInput size="sm" onSearch={handleSearch} placeholder="Araç ismine göre ara..." />

        {/* Sırala */}
        <div ref={sortRef} className="relative shrink-0">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-xs',
              sortKey !== 'date_desc' && 'border-primary text-primary ring-1 ring-primary/30',
            )}
            onClick={() => setShowSortPanel((v) => !v)}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'Sırala'}
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showSortPanel && 'rotate-180')}
            />
          </Button>

          {showSortPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-2">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSortKey(value);
                      setShowSortPanel(false);
                      setPage(1);
                    }}
                    className={cn(
                      'flex w-full items-center rounded-md px-2 py-1.5 text-xs hover:bg-muted',
                      sortKey === value && 'font-semibold text-primary',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', showFilterPanel && 'rotate-180')}
            />
          </Button>

          {showFilterPanel && (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-background shadow-lg">
              <div className="p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Durum
                </p>
                <div className="space-y-2">
                  {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={statusFilter === value}
                        onCheckedChange={() => toggleStatusFilter(value)}
                      />
                      <span className="text-xs">{label}</span>
                    </label>
                  ))}
                </div>

                <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Kapı Yönü
                </p>
                <div className="space-y-2">
                  {DOOR_FILTER_OPTIONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={doorFilters.has(value)}
                        onCheckedChange={() => toggleDoorFilter(value)}
                      />
                      <span
                        className={cn('inline-block h-2 w-2 rounded-full', {
                          'bg-zinc-400': value === 'rear' || value === 'rearAndSide',
                          'bg-teal-500': value === 'side',
                          'bg-violet-500': value === 'top',
                        })}
                      />
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
                    onClick={clearFilters}
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
          onClick={() => exportVehiclesToExcel(filteredVehicles, {})}
          disabled={filteredVehicles.length === 0}
        >
          <Upload className="h-3.5 w-3.5" />
          Dışa Aktar
        </Button>

        {/* İçe Aktar */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          onClick={() => setShowBulkImport(true)}
        >
          <Download className="h-3.5 w-3.5" />
          İçe Aktar
        </Button>

        {/* Yeni Araç Ekle */}
        <Button size="sm" className="shrink-0 gap-1.5 text-xs" onClick={onCreateClick}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Yeni Araç Ekle
        </Button>
      </div>

      {/* No-results alert */}
      {noResults && (
        <Alert>
          <AlertDescription>Aradığınız kriterlere uygun araç bulunamadı.</AlertDescription>
        </Alert>
      )}

      {/* Table card */}
      <div
        ref={tableCardRef}
        className="overflow-x-auto scrollbar-hide rounded-2xl border border-border bg-background"
      >
        {showSkeleton ? (
          <VehicleTableSkeleton />
        ) : (
          <Table className="min-w-[1000px] table-fixed">
            <TableHeader>
              <TableRow className="h-9 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-44 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Araç
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Tip
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Plaka/Seri No
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
                <TableHead className="w-28 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Maks Yük
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Kapı Yönü
                </TableHead>
                <TableHead className="w-24 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
                  Durum
                </TableHead>
                <TableHead className="w-20 whitespace-nowrap py-0 px-3 text-[10px] font-semibold uppercase tracking-widest">
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
                    Henüz araç eklenmemiş.
                  </TableCell>
                </TableRow>
              )}
              {filteredVehicles.map((v) => (
                <VehicleRow
                  key={v.id}
                  vehicle={v}
                  onDelete={setVehicleToDelete}
                  onToggleFavorite={(id, next) => toggleFavorite({ id, isFavorite: next })}
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
            Toplam <span className="font-medium text-foreground">{totalCount}</span> araç
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

      <VehicleDeleteDialog vehicle={vehicleToDelete} onClose={() => setVehicleToDelete(null)} />
      <VehicleBulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} />
    </div>
  );
}
