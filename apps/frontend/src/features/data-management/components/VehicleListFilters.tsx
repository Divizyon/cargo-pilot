import { useRef, useEffect, useState } from 'react';
import { Plus, SlidersHorizontal, ChevronDown, Star, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { VehicleExportButton } from './VehicleExportButton';
import { SearchInput } from './SearchInput';
import type { useVehicleFilters, VehicleSortKey } from '../hooks/useVehicleFilters';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';

type FilterHook = ReturnType<typeof useVehicleFilters>;

interface Props {
  filters: FilterHook;
  vehicles: Vehicle[];
  vehicleFilters: VehicleFilters;
  onCreateClick: () => void;
}

type VehicleTypeTab = 'all' | 'Tir' | 'Kamyon' | 'Kamposet' | 'Konteyner';

const TYPE_TABS: { value: VehicleTypeTab; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'Tir', label: 'Tır' },
  { value: 'Kamyon', label: 'Kamyon' },
  { value: 'Kamposet', label: 'Kamposet' },
  { value: 'Konteyner', label: 'Konteyner' },
];

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Arşivlenmiş' },
];

const SORT_OPTIONS: { value: VehicleSortKey; label: string }[] = [
  { value: 'date_desc', label: 'En Yeni' },
  { value: 'date_asc', label: 'En Eski' },
  { value: 'name_asc', label: "A'dan Z'ye" },
  { value: 'name_desc', label: "Z'den A'ya" },
];

export function VehicleListFilters({ filters, vehicles, vehicleFilters, onCreateClick }: Props) {
  const {
    setSearchQuery,
    vehicleType,
    setVehicleType,
    statusFilter,
    setStatusFilter,
    favoritesOnly,
    setFavoritesOnly,
    sortKey,
    setSortKey,
    activeFilterCount,
  } = filters;

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

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

  const currentTab: VehicleTypeTab = (vehicleType as VehicleTypeTab) || 'all';
  const hasActiveFilters = activeFilterCount > 0;

  function handleTabClick(tab: VehicleTypeTab) {
    setVehicleType(tab === 'all' ? '' : tab);
  }

  function toggleStatus(value: string) {
    setStatusFilter(statusFilter === value ? '' : value);
  }

  function clearFilters() {
    setStatusFilter('');
    setFavoritesOnly(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Vehicle type tabs */}
      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabClick(tab.value)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              currentTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <SearchInput onSearch={setSearchQuery} placeholder="Araç adı veya plaka ile ara..." />

      {/* Sırala dropdown */}
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

      {/* Filtrele dropdown */}
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
              {activeFilterCount}
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
                      onCheckedChange={() => toggleStatus(value)}
                    />
                    <span className="text-xs">{label}</span>
                  </label>
                ))}
              </div>

              <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Diğer
              </p>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted">
                <Checkbox
                  checked={favoritesOnly}
                  onCheckedChange={(checked) => setFavoritesOnly(Boolean(checked))}
                />
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs">Sadece Favoriler</span>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="mt-3 text-[11px] text-muted-foreground underline hover:text-foreground"
                  onClick={clearFilters}
                >
                  Filtreleri temizle
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dışa Aktar */}
      <VehicleExportButton vehicles={vehicles} filters={vehicleFilters} />

      {/* Yeni Araç Ekle */}
      <Button size="sm" className="shrink-0 gap-1.5 text-xs" onClick={onCreateClick}>
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Yeni Araç Ekle
      </Button>
    </div>
  );
}
