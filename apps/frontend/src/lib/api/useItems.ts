import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { itemSchema } from '@/lib/types/item';
import type { ProductFormValues } from '@/features/data-management/schemas/productSchema';
import { axiosInstance } from './axiosInstance';
import { apiFetch } from './fetcher';
import { buildCreateItemPayload } from './itemMappers';

const ITEMS_ENDPOINT = '/api/v1/items';

interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}

interface CreateItemResponse {
  isSuccess?: boolean;
  message?: string;
  data?: { id: string };
}

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

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation<CreateItemResponse, AxiosError<ProblemDetails>, ProductFormValues>({
    mutationFn: (values) =>
      axiosInstance
        .post<CreateItemResponse>(ITEMS_ENDPOINT, buildCreateItemPayload(values))
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Ürün başarıyla eklendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 409) {
        toast.error('Bu SKU zaten kullanılıyor.', { position: 'bottom-right' });
        return;
      }

      if (status === 400) {
        toast.error(detail ?? 'Doğrulama hatası. Lütfen alanları kontrol edin.', {
          position: 'bottom-right',
        });
        return;
      }

      // 401, 5xx ve network hataları zaten axiosInstance interceptor'ında toast'lanıyor.
      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Ürün eklenemedi.', { position: 'bottom-right' });
      }
    },
  });
}
