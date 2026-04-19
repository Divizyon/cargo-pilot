import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { itemSchema } from '@/lib/types/item';
import type { ProductFormValues } from '@/features/data-management/schemas/productSchema';
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

const bulkCreateResponseSchema = z.object({
  created: z.number().int().min(0),
});

export function useBulkCreateItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ProductFormValues[]) =>
      apiFetch('/items/bulk', bulkCreateResponseSchema, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
