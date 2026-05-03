import { useState, useDeferredValue, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, SlidersHorizontal, Search, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { VehicleListTable } from '@/features/data-management/components/VehicleListTable';
import { VehicleDeleteDialog } from '@/features/data-management/components/VehicleDeleteDialog';
import { cn } from '@/lib/utils';
import { useVehicles } from '@/lib/api/useVehicles';
import { exportVehiclesToExcel } from '@/lib/utils/exportVehiclesToExcel';
import type { Vehicle, VehicleType } from '@/lib/types/vehicle';

const TYPE_TABS: { label: string; value: VehicleType | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Kamyon', value: 'Kamyon' },
  { label: 'Konteyner', value: 'Konteyner' },
  { label: 'Römork', value: 'Romork' },
  { label: 'Tır', value: 'Tir' },
];

const DOOR_OPTIONS = [
  { label: 'Arka', value: 'rear' },
  { label: 'Yan', value: 'side' },
  { label: 'Üst', value: 'top' },
];

const STATUS_OPTIONS = [
  { label: 'Aktif', value: 'active' },
  { label: 'Pasif', value: 'inactive' },
];

interface FilterState {
  doorDirections: string[];
  status: 'all' | 'active' | 'inactive';
}

const DEFAULT_FILTERS: FilterState = { doorDirections: [], status: 'all' };

function activeFilterCount(f: FilterState) {
  return f.doorDirections.length + (f.status !== 'all' ? 1 : 0);
}

export function VehiclesPage() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<VehicleType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const deferredSearch = useDeferredValue(search);

  const isActive =
    filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined;

  const { data: raw = [], isLoading } = useVehicles({
    search: deferredSearch || undefined,
    vehicleType: activeType !== 'all' ? activeType : undefined,
    isActive,
  });

  // Door direction is client-side filtered (backend doesn't support it)
  const vehicles = useMemo(() => {
    if (filters.doorDirections.length === 0) return raw;
    return raw.filter((v) => filters.doorDirections.includes(v.doorDirection));
  }, [raw, filters.doorDirections]);

  function toggleDoor(value: string) {
    setFilters((prev) => ({
      ...prev,
      doorDirections: prev.doorDirections.includes(value)
        ? prev.doorDirections.filter((d) => d !== value)
        : [...prev.doorDirections, value],
    }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const filterCount = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Araç Yönetimi</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Lojistik operasyonlarda kullanılan tır, kamyon ve konteynerlerin fiziksel kısıtlarını
          tanımlar.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type tabs */}
        <div className="flex rounded-lg border bg-white p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveType(tab.value)}
              className={cn(
                'rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors',
                activeType === tab.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-80">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Araç ismine göre ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn('gap-1.5', filterCount > 0 && 'border-foreground')}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtrele
                {filterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                    {filterCount}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Filtreler</p>
                {filterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Temizle
                  </button>
                )}
              </div>

              {/* Kapı Yönü */}
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Kapı Yönü
                </p>
                <div className="flex flex-col gap-2">
                  {DOOR_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={filters.doorDirections.includes(opt.value)}
                        onCheckedChange={() => toggleDoor(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Durum */}
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Durum
                </p>
                <div className="flex flex-col gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={filters.status === opt.value}
                        onCheckedChange={() =>
                          setFilters((prev) => ({
                            ...prev,
                            status:
                              prev.status === opt.value
                                ? 'all'
                                : (opt.value as 'active' | 'inactive'),
                          }))
                        }
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => exportVehiclesToExcel(vehicles)}
            disabled={vehicles.length === 0}
          >
            <Download className="h-4 w-4" />
            Dışa Aktar
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            onClick={() => navigate('/vehicles/new')}
          >
            <Plus className="h-4 w-4" />
            Yeni Araç Ekle
          </Button>
        </div>
      </div>

      <VehicleListTable
        vehicles={vehicles}
        isLoading={isLoading}
        onDelete={setVehicleToDelete}
        onDetail={(v) => navigate(`/vehicles/${v.id}/edit`, { state: { vehicle: v } })}
        onEdit={(v) => navigate(`/vehicles/${v.id}/edit`, { state: { vehicle: v } })}
      />

      <VehicleDeleteDialog vehicle={vehicleToDelete} onClose={() => setVehicleToDelete(null)} />
    </div>
  );
}
