import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from './axiosInstance';
import { fromApiItem, paginatedItemsApiSchema } from './itemMappers';
import type { Item } from '@/lib/types/item';

export interface ItemFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedItems {
  items: Item[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const ITEMS_ENDPOINT = '/api/v1/items';

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters] as const,
    queryFn: async (): Promise<PaginatedItems> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('searchTerm', filters.search);
      if (filters?.page !== undefined) params.set('page', String(filters.page));
      if (filters?.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
      const qs = params.toString();
      const { data } = await axiosInstance.get<unknown>(`${ITEMS_ENDPOINT}${qs ? `?${qs}` : ''}`);
      const parsed = paginatedItemsApiSchema.parse(data);
      return {
        items: parsed.data.items.map(fromApiItem),
        totalCount: parsed.data.totalCount,
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
      };
    },
  });
}
