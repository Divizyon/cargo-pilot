import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import type { ProductFormValues } from '@/features/data-management/schemas/productSchema';
import type { Item } from '@/lib/types/item';
import { axiosInstance } from './axiosInstance';
import {
  buildCreateItemPayload,
  buildUpdateItemPayload,
  fromApiItem,
  itemApiResponseSchema,
  paginatedItemsApiSchema,
} from './itemMappers';

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

export interface ItemFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useItems(filters?: ItemFilters) {
  return useQuery({
    queryKey: ['items', filters] as const,
    queryFn: async (): Promise<Item[]> => {
      const params = new URLSearchParams();
      if (filters?.search) params.set('searchTerm', filters.search);
      if (filters?.page !== undefined) params.set('page', String(filters.page));
      if (filters?.pageSize !== undefined) params.set('pageSize', String(filters.pageSize));
      const qs = params.toString();
      const { data } = await axiosInstance.get<unknown>(`${ITEMS_ENDPOINT}${qs ? `?${qs}` : ''}`);
      const parsed = paginatedItemsApiSchema.parse(data);
      return parsed.data.items.map(fromApiItem);
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id] as const,
    queryFn: async (): Promise<Item> => {
      const { data } = await axiosInstance.get<unknown>(`${ITEMS_ENDPOINT}/${id}`);
      const parsed = itemApiResponseSchema.parse(data);
      return fromApiItem(parsed.data);
    },
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

      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Ürün eklenemedi.', { position: 'bottom-right' });
      }
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ProblemDetails>, string>({
    mutationFn: (id) => axiosInstance.delete(`${ITEMS_ENDPOINT}/${id}`).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Ürün silindi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 409) {
        toast.error('Bu ürün aktif bir planda kullanıldığı için silinemez.', {
          position: 'bottom-right',
        });
        return;
      }

      if (status === 404) {
        toast.error('Ürün bulunamadı.', { position: 'bottom-right' });
        return;
      }

      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Ürün silinemedi.', { position: 'bottom-right' });
      }
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation<
    CreateItemResponse,
    AxiosError<ProblemDetails>,
    { id: string; values: ProductFormValues }
  >({
    mutationFn: ({ id, values }) =>
      axiosInstance
        .put<CreateItemResponse>(`${ITEMS_ENDPOINT}/${id}`, buildUpdateItemPayload(id, values))
        .then((r) => r.data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', id] });
      toast.success('Ürün güncellendi', { position: 'bottom-right' });
    },
    onError: (error) => {
      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      if (status === 409) {
        toast.error('Bu SKU başka bir üründe zaten kullanılıyor.', { position: 'bottom-right' });
        return;
      }

      if (status === 404) {
        toast.error('Ürün bulunamadı.', { position: 'bottom-right' });
        return;
      }

      if (status === 400) {
        toast.error(detail ?? 'Doğrulama hatası. Lütfen alanları kontrol edin.', {
          position: 'bottom-right',
        });
        return;
      }

      if (status && status !== 401 && status < 500) {
        toast.error(detail ?? 'Ürün güncellenemedi.', { position: 'bottom-right' });
      }
    },
  });
}
