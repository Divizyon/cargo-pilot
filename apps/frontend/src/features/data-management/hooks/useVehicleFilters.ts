import { useState } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

export interface VehicleFilterState {
  searchQuery: string;
  vehicleType: string;
  statusFilter: string;
  favoritesOnly: boolean;
  page: number;
  pageSize: number;
}

export type VehicleSortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

const SORT_KEY_TO_PARAMS: Record<VehicleSortKey, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
  date_desc: { sortBy: 'createdAt', sortOrder: 'desc' },
  date_asc: { sortBy: 'createdAt', sortOrder: 'asc' },
  name_asc: { sortBy: 'name', sortOrder: 'asc' },
  name_desc: { sortBy: 'name', sortOrder: 'desc' },
};

export function useVehicleFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<VehicleSortKey>('date_desc');
  const pageSize = 20;

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(vehicleType && { vehicleType }),
    ...(statusFilter && { status: statusFilter }),
    ...(favoritesOnly && { favoritesOnly: true }),
    page,
    pageSize,
    ...SORT_KEY_TO_PARAMS[sortKey],
  };

  function clearFilter(key: keyof VehicleFilterState) {
    if (key === 'searchQuery') setSearchQuery('');
    if (key === 'vehicleType') setVehicleType('');
    if (key === 'statusFilter') setStatusFilter('');
    if (key === 'favoritesOnly') setFavoritesOnly(false);
    if (key === 'page') setPage(1);
  }

  const activeFilterCount = [debouncedSearch, vehicleType, statusFilter, favoritesOnly].filter(
    Boolean,
  ).length;

  return {
    searchQuery,
    setSearchQuery,
    vehicleType,
    setVehicleType,
    statusFilter,
    setStatusFilter,
    favoritesOnly,
    setFavoritesOnly,
    page,
    setPage,
    pageSize,
    sortKey,
    setSortKey,
    filters,
    clearFilter,
    activeFilterCount,
  };
}
