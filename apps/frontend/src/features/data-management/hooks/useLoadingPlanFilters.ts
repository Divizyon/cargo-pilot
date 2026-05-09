import { useSearchParams } from 'react-router-dom';

export interface LoadingPlanFiltersState {
  search: string;
  statusTab: string;
  plate: string;
  vehicleNames: string[];
  dateFrom: string;
  dateTo: string;
  hasActiveFilters: boolean;
}

export interface LoadingPlanFiltersActions {
  setSearch: (v: string) => void;
  setStatusTab: (v: string) => void;
  setPlate: (v: string) => void;
  setVehicleNames: (v: string[]) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  clearFilters: () => void;
}

export type LoadingPlanFiltersHook = LoadingPlanFiltersState & LoadingPlanFiltersActions;

export function useLoadingPlanFilters(): LoadingPlanFiltersHook {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const statusTab = searchParams.get('status') ?? 'all';
  const plate = searchParams.get('plate') ?? '';
  const vehicleNames = searchParams.get('vehicles')?.split(',').filter(Boolean) ?? [];
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const hasActiveFilters = Boolean(search || plate || vehicleNames.length || dateFrom || dateTo);

  function setParam(key: string, value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  function setSearch(v: string) {
    setParam('q', v);
  }

  function setStatusTab(v: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v && v !== 'all') next.set('status', v);
        else next.delete('status');
        return next;
      },
      { replace: true },
    );
  }

  function setPlate(v: string) {
    setParam('plate', v);
  }

  function setVehicleNames(v: string[]) {
    setParam('vehicles', v.join(','));
  }

  function setDateFrom(v: string) {
    setParam('dateFrom', v);
  }

  function setDateTo(v: string) {
    setParam('dateTo', v);
  }

  function clearFilters() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        next.delete('plate');
        next.delete('vehicles');
        next.delete('dateFrom');
        next.delete('dateTo');
        return next;
      },
      { replace: true },
    );
  }

  return {
    search,
    statusTab,
    plate,
    vehicleNames,
    dateFrom,
    dateTo,
    hasActiveFilters,
    setSearch,
    setStatusTab,
    setPlate,
    setVehicleNames,
    setDateFrom,
    setDateTo,
    clearFilters,
  };
}
