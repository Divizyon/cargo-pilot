import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { itemSchema } from '@/lib/types/item';
import { apiFetch } from './fetcher';

interface ItemFilters {
  search?: string;
  page?: number;
}

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters] as const,
    queryFn: () => apiFetch('/items', z.array(itemSchema)),
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id] as const,
    queryFn: () => apiFetch(`/items/${id}`, itemSchema),
    enabled: Boolean(id),
  });
}
