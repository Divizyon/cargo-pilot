import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { VehicleExportButton } from './VehicleExportButton';
import type { useVehicleFilters } from '../hooks/useVehicleFilters';
import type { Vehicle } from '@/lib/types/vehicle';
import type { VehicleFilters } from '@/lib/api/useVehicles';

type FilterHook = ReturnType<typeof useVehicleFilters>;

interface Props {
  filters: FilterHook;
  vehicles: Vehicle[];
  vehicleFilters: VehicleFilters;
  onCreateClick: () => void;
}

const VEHICLE_TYPE_OPTIONS = [
  { value: 'Tir', label: 'Tır' },
  { value: 'Kamyon', label: 'Kamyon' },
  { value: 'Romork', label: 'Römork' },
  { value: 'Konteyner', label: 'Konteyner' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'draft', label: 'Arşivlenmiş' },
];

export function VehicleListFilters({ filters, vehicles, vehicleFilters, onCreateClick }: Props) {
  const {
    searchQuery,
    setSearchQuery,
    vehicleType,
    setVehicleType,
    statusFilter,
    setStatusFilter,
    favoritesOnly,
    setFavoritesOnly,
    clearFilter,
  } = filters;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Araç adı veya plaka ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-64 shrink-0"
        />
        <Select
          value={vehicleType || undefined}
          onValueChange={(v) => setVehicleType(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-44 shrink-0">
            <SelectValue placeholder="Araç Tipi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tümü</SelectItem>
            {VEHICLE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter || undefined}
          onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="h-9 w-44 shrink-0">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tümü</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Toggle
          pressed={favoritesOnly}
          onPressedChange={setFavoritesOnly}
          aria-label="Sadece favorileri göster"
          className="h-9 shrink-0 text-sm"
        >
          ★ Sadece Favorileri Göster
        </Toggle>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <VehicleExportButton vehicles={vehicles} filters={vehicleFilters} />
          <Button size="sm" className="gap-1.5 text-xs" onClick={onCreateClick}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Yeni Araç Ekle
          </Button>
        </div>
      </div>

      {(searchQuery || vehicleType || statusFilter || favoritesOnly) && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Arama: {searchQuery}
              <button onClick={() => clearFilter('searchQuery')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {vehicleType && (
            <Badge variant="secondary" className="gap-1">
              Tip: {vehicleType}
              <button onClick={() => clearFilter('vehicleType')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {statusFilter && (
            <Badge variant="secondary" className="gap-1">
              Durum: {statusFilter === 'active' ? 'Aktif' : 'Arşivlenmiş'}
              <button onClick={() => clearFilter('statusFilter')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {favoritesOnly && (
            <Badge variant="secondary" className="gap-1">
              Sadece Favoriler
              <button onClick={() => clearFilter('favoritesOnly')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
