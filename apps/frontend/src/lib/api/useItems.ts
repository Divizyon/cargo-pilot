import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import { itemSchema } from '@/lib/types/item';
import {
  toCentimeters,
  type ProductFormValues,
  DIMENSION_UNITS,
  WEIGHT_UNITS,
} from '@/features/data-management/schemas/productSchema';
import { apiFetch } from './fetcher';

interface ItemFilters {
  search?: string;
  page?: number;
}

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters] as const,
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('search', filters.search);
      if (filters?.page !== undefined) params.set('page', String(filters.page));
      const qs = params.toString();
      return apiFetch(`/items${qs ? `?${qs}` : ''}`, z.array(itemSchema));
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id] as const,
    queryFn: () => apiFetch(`/items/${id}`, itemSchema),
    enabled: Boolean(id),
  });
}

const createItemResponseSchema = itemSchema.partial({ id: true });

function buildCreateItemPayload(values: ProductFormValues) {
  return {
    name: values.name,
    sku: values.sku,
    productType: values.productType,
    width: toCentimeters(values.width, values.widthUnit),
    widthUnitId: DIMENSION_UNITS[values.widthUnit],
    height: toCentimeters(values.height, values.heightUnit),
    heightUnitId: DIMENSION_UNITS[values.heightUnit],
    length: toCentimeters(values.length, values.lengthUnit),
    lengthUnitId: DIMENSION_UNITS[values.lengthUnit],
    weight: values.weight,
    weightUnitId: WEIGHT_UNITS[values.weightUnit],
    fragility: values.fragility,
    isStackable: values.isStackable,
    maxStackCount: values.maxStackCount ?? null,
    allowRotateX: values.allowRotateX,
    allowRotateY: values.allowRotateY,
    allowRotateZ: values.allowRotateZ,
  };
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProductFormValues) =>
      apiFetch('/items', createItemResponseSchema, {
        method: 'POST',
        body: JSON.stringify(buildCreateItemPayload(values)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Ürün başarıyla eklendi');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Ürün eklenemedi');
    },
  });
}
