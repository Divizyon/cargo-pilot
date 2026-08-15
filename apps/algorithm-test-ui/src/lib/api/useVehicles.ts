import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from './axiosInstance';
import { fromApiVehicleListItem, vehicleListApiItemSchema } from './vehicleMappers';
import type { Vehicle } from '@/lib/types/vehicle';

export interface VehicleFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface VehiclesPage {
  items: Vehicle[];
  totalCount: number;
}

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters] as const,
    queryFn: async (): Promise<VehiclesPage> => {
      const params = new URLSearchParams();
      params.set('isDeleted', 'false');
      if (filters?.search) params.set('searchTerm', filters.search);
      if (filters?.page !== undefined) params.set('page', String(filters.page));
      if (filters?.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));

      const { data } = await axiosInstance.get<unknown>(`/api/v1/vehicles?${params.toString()}`);
      const raw = (data as Record<string, unknown>)?.data as Record<string, unknown>;
      const rawItems = raw?.items;
      const totalCount = (raw?.totalCount as number) ?? 0;
      if (!Array.isArray(rawItems)) return { items: [], totalCount };

      const items: Vehicle[] = [];
      for (const item of rawItems) {
        const result = vehicleListApiItemSchema.safeParse(item);
        if (result.success) items.push(fromApiVehicleListItem(result.data));
      }
      return { items, totalCount };
    },
    staleTime: 5 * 60 * 1000,
  });
}
