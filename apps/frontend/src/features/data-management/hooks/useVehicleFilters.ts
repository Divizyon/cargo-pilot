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

export function useVehicleFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filters = {
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(vehicleType && { vehicleType }),
    ...(statusFilter && { status: statusFilter }),
    ...(favoritesOnly && { favoritesOnly: true }),
    page,
    pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
  };

  function clearFilter(key: keyof VehicleFilterState) {
    if (key === 'searchQuery') setSearchQuery('');
    if (key === 'vehicleType') setVehicleType('');
    if (key === 'statusFilter') setStatusFilter('');
    if (key === 'favoritesOnly') setFavoritesOnly(false);
    if (key === 'page') setPage(1);
  }

  const activeFilterCount = [
    debouncedSearch,
    vehicleType,
    statusFilter,
    favoritesOnly,
  ].filter(Boolean).length;

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
    filters,
    clearFilter,
    activeFilterCount,
  };
}
